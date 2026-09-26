import { User } from '../models/user.model.js'

// Category to staff skill mapping:
const categorySkillMap = {
  maintenance: 'maintenance',
  plumbing: 'plumbing',
  internet: 'internet',
  cleanliness: 'cleanliness',
  mess: 'mess',
  security: 'security',
  electricity: 'maintenance',
  other: null
}

export const autoAssignStaff = async (
  category
) => {
  try {
    const skill = categorySkillMap[category]

    // Find available staff:
    let staff = null

    if (skill) {
      // Find staff with matching skill:
      staff = await User.findOne({
        role: 'staff',
        isActive: true,
        skills: skill
      })
    }

    // If no specialist found — any staff:
    if (!staff) {
      staff = await User.findOne({
        role: 'staff',
        isActive: true
      })
    }

    return staff?._id || null
  } catch {
    return null
  }
}