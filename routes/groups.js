import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/db.js';
import { auth } from '../middleware/auth.js';
import activityLogger from '../utils/activityLogger.js';

const router = express.Router();

// GET /api/groups - Get all groups for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const [groups] = await pool.execute(
      `SELECT g.*, COUNT(gm.id) as member_count 
       FROM \`groups\` g 
       LEFT JOIN group_members gm ON g.id = gm.group_id 
       WHERE g.created_by = ? AND g.is_active = TRUE 
       GROUP BY g.id 
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );

    // Get members for each group
    for (let group of groups) {
      const [members] = await pool.execute(
        'SELECT email FROM group_members WHERE group_id = ? ORDER BY added_at',
        [group.id]
      );
      group.emails = members.map(m => m.email);
    }

    res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/groups - Create a new group
router.post('/', auth, [
  body('name').notEmpty().withMessage('Group name is required'),
  body('emails').optional().isArray().withMessage('Emails must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, description = '', emails = [] } = req.body;

    // Check if group name already exists for this user
    const [existingGroups] = await pool.execute(
      'SELECT id FROM `groups` WHERE name = ? AND created_by = ? AND is_active = TRUE',
      [name, req.user.id]
    );

    if (existingGroups.length > 0) {
      return res.status(400).json({ message: 'A group with this name already exists' });
    }

    // Create the group
    const [groupResult] = await pool.execute(
      'INSERT INTO `groups` (name, description, created_by) VALUES (?, ?, ?)',
      [name, description, req.user.id]
    );

    const groupId = groupResult.insertId;

    // Add members to the group
    if (emails.length > 0) {
      for (const email of emails) {
        await pool.execute(
          'INSERT INTO group_members (group_id, email) VALUES (?, ?)',
          [groupId, email]
        );
      }
    }

    // Get the created group with members
    const [newGroup] = await pool.execute(
      'SELECT * FROM `groups` WHERE id = ?',
      [groupId]
    );

    const [members] = await pool.execute(
      'SELECT email FROM group_members WHERE group_id = ? ORDER BY added_at',
      [groupId]
    );

    const groupWithMembers = {
      ...newGroup[0],
      emails: members.map(m => m.email)
    };

    // Log the activity (temporarily disabled)
    // await activityLogger.logActivity({
    //   user_id: req.user.id,
    //   object_type: 'Group',
    //   object_id: groupId,
    //   object_name: name,
    //   event_type: 'Created',
    //   event_description: `Created group "${name}" with ${emails.length} members`,
    //   impact: 'positive'
    // });

    res.status(201).json({ 
      message: 'Group created successfully',
      group: groupWithMembers 
    });

  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/groups/:id - Update a group
router.put('/:id', auth, [
  body('name').notEmpty().withMessage('Group name is required'),
  body('emails').optional().isArray().withMessage('Emails must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { id } = req.params;
    const { name, description = '', emails = [] } = req.body;

    // Check if group exists and belongs to user
    const [existingGroup] = await pool.execute(
      'SELECT * FROM `groups` WHERE id = ? AND created_by = ? AND is_active = TRUE',
      [id, req.user.id]
    );

    if (existingGroup.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if new name conflicts with existing groups
    const [nameConflict] = await pool.execute(
      'SELECT id FROM `groups` WHERE name = ? AND created_by = ? AND id != ? AND is_active = TRUE',
      [name, req.user.id, id]
    );

    if (nameConflict.length > 0) {
      return res.status(400).json({ message: 'A group with this name already exists' });
    }

    // Update the group
    await pool.execute(
      'UPDATE `groups` SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description, id]
    );

    // Remove all existing members
    await pool.execute('DELETE FROM group_members WHERE group_id = ?', [id]);

    // Add new members
    if (emails.length > 0) {
      for (const email of emails) {
        await pool.execute(
          'INSERT INTO group_members (group_id, email) VALUES (?, ?)',
          [id, email]
        );
      }
    }

    // Get the updated group with members
    const [updatedGroup] = await pool.execute(
      'SELECT * FROM `groups` WHERE id = ?',
      [id]
    );

    const [members] = await pool.execute(
      'SELECT email FROM group_members WHERE group_id = ? ORDER BY added_at',
      [id]
    );

    const groupWithMembers = {
      ...updatedGroup[0],
      emails: members.map(m => m.email)
    };

    // Log the activity (temporarily disabled)
    // await activityLogger.logActivity({
    //   user_id: req.user.id,
    //   object_type: 'Group',
    //   object_id: id,
    //   object_name: name,
    //   event_type: 'Updated',
    //   event_description: `Updated group "${name}" with ${emails.length} members`,
    //   impact: 'neutral'
    // });

    res.json({ 
      message: 'Group updated successfully',
      group: groupWithMembers 
    });

  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/groups/:id - Delete a group
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if group exists and belongs to user
    const [existingGroup] = await pool.execute(
      'SELECT * FROM `groups` WHERE id = ? AND created_by = ? AND is_active = TRUE',
      [id, req.user.id]
    );

    if (existingGroup.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const groupName = existingGroup[0].name;

    // Soft delete the group (set is_active to false)
    await pool.execute(
      'UPDATE `groups` SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    // Log the activity (temporarily disabled)
    // await activityLogger.logActivity({
    //   user_id: req.user.id,
    //   object_type: 'Group',
    //   object_id: id,
    //   object_name: groupName,
    //   event_type: 'Deleted',
    //   event_description: `Deleted group "${groupName}"`,
    //   impact: 'negative'
    // });

    res.json({ message: 'Group deleted successfully' });

  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/groups/:id - Get a specific group
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const [groups] = await pool.execute(
      'SELECT * FROM `groups` WHERE id = ? AND created_by = ? AND is_active = TRUE',
      [id, req.user.id]
    );

    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const group = groups[0];

    // Get members
    const [members] = await pool.execute(
      'SELECT email FROM group_members WHERE group_id = ? ORDER BY added_at',
      [id]
    );

    group.emails = members.map(m => m.email);

    res.json({ group });

  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 