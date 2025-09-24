import pool from '../config/db.js';

// Activity Logger Utility
export const activityLogger = {
  // Log lead activities
  logLeadCreated: async (userId, leadId, leadName, source, stage) => {
    try {
      const query = `
        INSERT INTO activity_logs 
        (user_id, object_type, object_id, object_name, event_type, event_description, value_before, value_after, impact, priority)
        VALUES (?, 'Lead', ?, ?, 'Lead created', ?, '[]', ?, 'positive', 'medium')
      `;
      
      const valueAfter = JSON.stringify([
        { type: "Source", value: source, color: "blue" },
        { type: "Stage", value: stage, color: "blue" }
      ]);
      
      await pool.execute(query, [
        userId,
        leadId,
        leadName,
        `New lead created from ${source}`,
        valueAfter
      ]);
    } catch (error) {
      console.error('Error logging lead creation:', error);
    }
  },

  logLeadStageChanged: async (userId, leadId, leadName, oldStage, newStage, impact = 'neutral') => {
    try {
      const query = `
        INSERT INTO activity_logs 
        (user_id, object_type, object_id, object_name, event_type, event_description, value_before, value_after, impact, priority)
        VALUES (?, 'Lead', ?, ?, 'Sales stage changed', ?, ?, ?, ?, 'high')
      `;
      
      const valueBefore = JSON.stringify([
        { type: "Pipeline", value: oldStage, color: "blue" }
      ]);
      
      const valueAfter = JSON.stringify([
        { type: "Pipeline", value: newStage, color: "green" }
      ]);
      
      const description = `Lead moved from ${oldStage} to ${newStage}`;
      
      await pool.execute(query, [
        userId,
        leadId,
        leadName,
        description,
        valueBefore,
        valueAfter,
        impact
      ]);
    } catch (error) {
      console.error('Error logging stage change:', error);
    }
  },

  logLeadWon: async (userId, leadId, leadName, oldStage) => {
    try {
      const query = `
        INSERT INTO activity_logs 
        (user_id, object_type, object_id, object_name, event_type, event_description, value_before, value_after, impact, priority)
        VALUES (?, 'Lead', ?, ?, 'Lead won', ?, ?, ?, 'positive', 'high')
      `;
      
      const valueBefore = JSON.stringify([
        { type: "Pipeline", value: oldStage, color: "blue" }
      ]);
      
      const valueAfter = JSON.stringify([
        { type: "Pipeline", value: "Closed - Won", color: "green" }
      ]);
      
      await pool.execute(query, [
        userId,
        leadId,
        leadName,
        `Lead successfully converted to customer`,
        valueBefore,
        valueAfter
      ]);
    } catch (error) {
      console.error('Error logging lead won:', error);
    }
  },

  logLeadLost: async (userId, leadId, leadName, oldStage) => {
    try {
      const query = `
        INSERT INTO activity_logs 
        (user_id, object_type, object_id, object_name, event_type, event_description, value_before, value_after, impact, priority)
        VALUES (?, 'Lead', ?, ?, 'Lead lost', ?, ?, ?, 'negative', 'high')
      `;
      
      const valueBefore = JSON.stringify([
        { type: "Pipeline", value: oldStage, color: "blue" }
      ]);
      
      const valueAfter = JSON.stringify([
        { type: "Pipeline", value: "Closed - Lost", color: "red" }
      ]);
      
      await pool.execute(query, [
        userId,
        leadId,
        leadName,
        `Lead marked as lost during ${oldStage}`,
        valueBefore,
        valueAfter
      ]);
    } catch (error) {
      console.error('Error logging lead lost:', error);
    }
  },

  logLeadAssigned: async (userId, leadId, leadName, oldAssignee, newAssignee) => {
    try {
      const query = `
        INSERT INTO activity_logs 
        (user_id, object_type, object_id, object_name, event_type, event_description, value_before, value_after, impact, priority)
        VALUES (?, 'Lead', ?, ?, 'Lead assigned', ?, ?, ?, 'neutral', 'low')
      `;
      
      const valueBefore = JSON.stringify([
        { type: "Assignee", value: oldAssignee || "Unassigned", color: "gray" }
      ]);
      
      const valueAfter = JSON.stringify([
        { type: "Assignee", value: newAssignee, color: "blue" }
      ]);
      
      await pool.execute(query, [
        userId,
        leadId,
        leadName,
        `Lead assigned to ${newAssignee}`,
        valueBefore,
        valueAfter
      ]);
    } catch (error) {
      console.error('Error logging lead assignment:', error);
    }
  },

  // Log task activities
  logTaskCreated: async (userId, taskId, taskName, dueDate, priority) => {
    try {
      const query = `
        INSERT INTO activity_logs 
        (user_id, object_type, object_id, object_name, event_type, event_description, value_before, value_after, impact, priority)
        VALUES (?, 'Task', ?, ?, 'Task created', ?, '[]', ?, 'positive', 'medium')
      `;
      
      const valueAfter = JSON.stringify([
        { type: "Due Date", value: dueDate, color: "blue" },
        { type: "Priority", value: priority, color: "red" }
      ]);
      
      await pool.execute(query, [
        userId,
        taskId,
        taskName,
        `New task created`,
        valueAfter
      ]);
    } catch (error) {
      console.error('Error logging task creation:', error);
    }
  },

  logTaskCompleted: async (userId, taskId, taskName) => {
    try {
      const query = `
        INSERT INTO activity_logs 
        (user_id, object_type, object_id, object_name, event_type, event_description, value_before, value_after, impact, priority)
        VALUES (?, 'Task', ?, ?, 'Task completed', ?, ?, ?, 'positive', 'medium')
      `;
      
      const valueBefore = JSON.stringify([
        { type: "Status", value: "In Progress", color: "yellow" }
      ]);
      
      const valueAfter = JSON.stringify([
        { type: "Status", value: "Completed", color: "green" }
      ]);
      
      await pool.execute(query, [
        userId,
        taskId,
        taskName,
        `Task marked as completed`,
        valueBefore,
        valueAfter
      ]);
    } catch (error) {
      console.error('Error logging task completion:', error);
    }
  },

  // Log contact activities
  logContactCreated: async (userId, contactId, contactName, email, phone) => {
    try {
      const query = `
        INSERT INTO activity_logs 
        (user_id, object_type, object_id, object_name, event_type, event_description, value_before, value_after, impact, priority)
        VALUES (?, 'Contact', ?, ?, 'Contact created', ?, '[]', ?, 'positive', 'medium')
      `;
      
      const valueAfter = JSON.stringify([
        { type: "Email", value: email, color: "teal" },
        { type: "Phone", value: phone, color: "teal" }
      ]);
      
      await pool.execute(query, [
        userId,
        contactId,
        contactName,
        `New contact added to CRM system`,
        valueAfter
      ]);
    } catch (error) {
      console.error('Error logging contact creation:', error);
    }
  },

  // Log invoice activities
  logInvoiceCreated: async (userId, invoiceId, invoiceName, amount) => {
    try {
      const query = `
        INSERT INTO activity_logs 
        (user_id, object_type, object_id, object_name, event_type, event_description, value_before, value_after, impact, priority)
        VALUES (?, 'Invoice', ?, ?, 'Invoice created', ?, '[]', ?, 'positive', 'medium')
      `;
      
      const valueAfter = JSON.stringify([
        { type: "Status", value: "Draft", color: "gray" },
        { type: "Amount", value: amount, color: "green" }
      ]);
      
      await pool.execute(query, [
        userId,
        invoiceId,
        invoiceName,
        `New invoice created`,
        valueAfter
      ]);
    } catch (error) {
      console.error('Error logging invoice creation:', error);
    }
  },

  logInvoiceStatusChanged: async (userId, invoiceId, invoiceName, oldStatus, newStatus) => {
    try {
      const query = `
        INSERT INTO activity_logs 
        (user_id, object_type, object_id, object_name, event_type, event_description, value_before, value_after, impact, priority)
        VALUES (?, 'Invoice', ?, ?, 'Invoice status changed', ?, ?, ?, 'positive', 'high')
      `;
      
      const valueBefore = JSON.stringify([
        { type: "Status", value: oldStatus, color: "yellow" }
      ]);
      
      const valueAfter = JSON.stringify([
        { type: "Status", value: newStatus, color: "green" }
      ]);
      
      await pool.execute(query, [
        userId,
        invoiceId,
        invoiceName,
        `Invoice status changed from ${oldStatus} to ${newStatus}`,
        valueBefore,
        valueAfter
      ]);
    } catch (error) {
      console.error('Error logging invoice status change:', error);
    }
  },

  // Log system activities
  logSystemActivity: async (userId, activityName, description, impact = 'neutral') => {
    try {
      const query = `
        INSERT INTO activity_logs 
        (user_id, object_type, object_id, object_name, event_type, event_description, value_before, value_after, impact, priority)
        VALUES (?, 'System', NULL, ?, ?, ?, '[]', ?, ?, 'low')
      `;
      
      const valueAfter = JSON.stringify([
        { type: "Status", value: "Completed", color: "green" }
      ]);
      
      await pool.execute(query, [
        userId,
        activityName,
        description,
        description,
        valueAfter,
        impact
      ]);
    } catch (error) {
      console.error('Error logging system activity:', error);
    }
  },

  // Generic activity logger for any object type
  logActivity: async (activityData) => {
    try {
      const {
        user_id,
        object_type,
        object_id,
        object_name,
        event_type,
        event_description,
        impact = 'neutral',
        priority = 'medium'
      } = activityData;

      const query = `
        INSERT INTO activity_logs 
        (user_id, object_type, object_id, object_name, event_type, event_description, value_before, value_after, impact, priority)
        VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?)
      `;
      
      const valueAfter = JSON.stringify([
        { type: "Status", value: "Completed", color: "green" }
      ]);
      
      await pool.execute(query, [
        user_id,
        object_type,
        object_id,
        object_name,
        event_type,
        event_description,
        valueAfter,
        impact,
        priority
      ]);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }
};

export default activityLogger; 