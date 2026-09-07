export const DB_NAME = "hostelManagement"

export const USER_ROLES = {
  ADMIN: 'admin',
  STUDENT: 'student',
  SECURITY: 'security',
  STAFF: 'staff'
}

export const COMPLAINT_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  REJECTED: 'rejected'
}

export const VISITOR_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out'
}

export const COMPLAINT_CATEGORIES = [
  'maintenance',
  'plumbing',
  'internet',
  'cleanliness',
  'mess',
  'security',
  'other'
]