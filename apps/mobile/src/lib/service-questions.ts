export type QuestionOption = {
  label: string
  value: string
  icon?: string
  allowText?: boolean  // show free-text input when this option is selected
}

export type QuestionStep = {
  id: string
  question: string
  hint?: string
  type?: 'single' | 'multi'  // default: 'single'
  options: QuestionOption[]
}

export type CategoryMeta = {
  label: string
  icon: string
  color: string
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  plumber:      { label: 'Plumbing',     icon: '🔧', color: '#eff6ff' },
  electrician:  { label: 'Electrical',   icon: '⚡', color: '#fefce8' },
  hvac:         { label: 'HVAC',         icon: '❄️',  color: '#ecfeff' },
  painter:      { label: 'Painting',     icon: '🎨', color: '#fdf2f8' },
  carpenter:    { label: 'Carpentry',    icon: '🪚', color: '#fffbeb' },
  cleaner:      { label: 'Cleaning',     icon: '🧹', color: '#f0fdf4' },
  landscaper:   { label: 'Landscaping',  icon: '🌿', color: '#ecfdf5' },
  roofer:       { label: 'Roofing',      icon: '🏠', color: '#fff7ed' },
  pest_control: { label: 'Pest Control', icon: '🐛', color: '#fef2f2' },
  security:     { label: 'Security',     icon: '🔒', color: '#f8fafc' },
  handyman:     { label: 'Handyman',     icon: '🛠️', color: '#f5f3ff' },
}

/** Appended as the final step for every category — answer maps to Algolia `island` facet */
export const LOCATION_STEP: QuestionStep = {
  id: 'island',
  type: 'single',
  question: 'Where is the property located?',
  hint: "We'll match you with providers in your area.",
  options: [
    { label: 'Grand Cayman',  value: 'grand_cayman' },
    { label: 'Cayman Brac',   value: 'cayman_brac' },
    { label: 'Little Cayman', value: 'little_cayman' },
  ],
}

export const SERVICE_QUESTIONS: Record<string, QuestionStep[]> = {
  plumber: [
    {
      id: 'issue_type',
      question: 'What type of plumbing issue?',
      options: [
        { label: 'Leaking pipe or faucet',     value: 'leak' },
        { label: 'Blocked drain or toilet',    value: 'blockage' },
        { label: 'No hot water',               value: 'hot_water' },
        { label: 'Water pressure problem',     value: 'pressure' },
        { label: 'Installation / new fixture', value: 'install' },
        { label: 'Other',                      value: 'other', allowText: true },
      ],
    },
    {
      id: 'urgency',
      question: 'How urgent is this?',
      options: [
        { label: 'Emergency — needs fixing now',   value: 'emergency' },
        { label: 'Urgent — within 24 hours',       value: 'urgent' },
        { label: 'This week',                      value: 'this_week' },
        { label: 'Flexible',                       value: 'flexible' },
      ],
    },
    {
      id: 'property_type',
      question: 'What type of property?',
      options: [
        { label: 'House',                 value: 'house' },
        { label: 'Apartment',             value: 'apartment' },
        { label: 'Business / Commercial', value: 'commercial' },
      ],
    },
  ],
  electrician: [
    {
      id: 'issue_type',
      question: 'What electrical work do you need?',
      options: [
        { label: 'Power outage / tripped breaker',  value: 'outage' },
        { label: 'Install outlet or switch',        value: 'install_outlet' },
        { label: 'Lighting installation or repair', value: 'lighting' },
        { label: 'Fan or AC wiring',                value: 'fan_ac' },
        { label: 'Electrical panel / rewiring',     value: 'panel' },
        { label: 'Other',                           value: 'other', allowText: true },
      ],
    },
    {
      id: 'urgency',
      question: 'How urgent is this?',
      options: [
        { label: 'Emergency — safety hazard', value: 'emergency' },
        { label: 'Urgent — within 24 hours',  value: 'urgent' },
        { label: 'This week',                 value: 'this_week' },
        { label: 'Flexible',                  value: 'flexible' },
      ],
    },
    {
      id: 'property_type',
      question: 'What type of property?',
      options: [
        { label: 'House',                 value: 'house' },
        { label: 'Apartment',             value: 'apartment' },
        { label: 'Business / Commercial', value: 'commercial' },
      ],
    },
  ],
  hvac: [
    {
      id: 'issue_type',
      question: 'What HVAC service do you need?',
      options: [
        { label: 'AC not cooling',                value: 'ac_repair' },
        { label: 'Heating not working',           value: 'heat_repair' },
        { label: 'Routine service / maintenance', value: 'maintenance' },
        { label: 'New system installation',       value: 'install' },
        { label: 'Duct cleaning',                 value: 'ducts' },
      ],
    },
    {
      id: 'urgency',
      question: 'How urgent is this?',
      options: [
        { label: 'Emergency — too hot/cold now', value: 'emergency' },
        { label: 'Urgent — within 24 hours',     value: 'urgent' },
        { label: 'This week',                    value: 'this_week' },
        { label: 'Flexible',                     value: 'flexible' },
      ],
    },
  ],
  cleaner: [
    {
      id: 'clean_type',
      question: 'What kind of cleaning?',
      options: [
        { label: 'Regular home cleaning',    value: 'regular' },
        { label: 'Deep / spring clean',      value: 'deep' },
        { label: 'Move-in / move-out clean', value: 'move' },
        { label: 'Office / commercial',      value: 'commercial' },
        { label: 'Post-construction clean',  value: 'post_construction' },
      ],
    },
    {
      id: 'size',
      question: 'How large is the space?',
      options: [
        { label: 'Studio or 1 bedroom', value: 'small' },
        { label: '2–3 bedrooms',        value: 'medium' },
        { label: '4+ bedrooms',         value: 'large' },
        { label: 'Commercial space',    value: 'commercial' },
      ],
    },
    {
      id: 'frequency',
      question: 'How often do you need cleaning?',
      options: [
        { label: 'One-time only', value: 'once' },
        { label: 'Weekly',        value: 'weekly' },
        { label: 'Bi-weekly',     value: 'biweekly' },
        { label: 'Monthly',       value: 'monthly' },
      ],
    },
  ],
  painter: [
    {
      id: 'paint_type',
      question: 'What needs painting?',
      options: [
        { label: 'Interior rooms',        value: 'interior' },
        { label: 'Exterior / outside',    value: 'exterior' },
        { label: 'Furniture or cabinets', value: 'furniture' },
        { label: 'Fence or deck',         value: 'fence' },
      ],
    },
    {
      id: 'urgency',
      question: 'When do you need it done?',
      options: [
        { label: 'ASAP',       value: 'asap' },
        { label: 'This week',  value: 'this_week' },
        { label: 'This month', value: 'this_month' },
        { label: 'Flexible',   value: 'flexible' },
      ],
    },
  ],
  landscaper: [
    {
      id: 'service_type',
      type: 'multi',
      question: 'What landscaping do you need?',
      hint: 'Select all that apply.',
      options: [
        { label: 'Lawn mowing',               value: 'mowing' },
        { label: 'Garden design or planting', value: 'garden' },
        { label: 'Tree trimming or removal',  value: 'tree' },
        { label: 'Irrigation system',         value: 'irrigation' },
        { label: 'Yard cleanup',              value: 'cleanup' },
        { label: 'Other',                     value: 'other', allowText: true },
      ],
    },
    {
      id: 'frequency',
      question: 'How often do you need this?',
      options: [
        { label: 'One-time', value: 'once' },
        { label: 'Weekly',   value: 'weekly' },
        { label: 'Monthly',  value: 'monthly' },
      ],
    },
  ],
  handyman: [
    {
      id: 'task_type',
      type: 'multi',
      question: 'What task do you need help with?',
      hint: 'Select all that apply.',
      options: [
        { label: 'Furniture assembly',           value: 'furniture' },
        { label: 'Mounting (TV, shelves, etc)',  value: 'mounting' },
        { label: 'Door or window repair',        value: 'door_window' },
        { label: 'Minor plumbing fix',           value: 'plumbing' },
        { label: 'General repairs',              value: 'general' },
        { label: 'Other',                        value: 'other', allowText: true },
      ],
    },
    {
      id: 'urgency',
      question: 'How soon do you need it?',
      options: [
        { label: 'Today / tomorrow', value: 'urgent' },
        { label: 'This week',        value: 'this_week' },
        { label: 'Flexible',         value: 'flexible' },
      ],
    },
  ],
  roofer: [
    {
      id: 'issue_type',
      question: 'What roofing work do you need?',
      options: [
        { label: 'Roof is leaking',             value: 'leak' },
        { label: 'Damaged or missing shingles', value: 'shingles' },
        { label: 'Full roof replacement',       value: 'replacement' },
        { label: 'Gutter cleaning or repair',   value: 'gutters' },
        { label: 'Inspection',                  value: 'inspection' },
      ],
    },
    {
      id: 'urgency',
      question: 'How urgent is this?',
      options: [
        { label: 'Emergency — active leak', value: 'emergency' },
        { label: 'Urgent — this week',      value: 'urgent' },
        { label: 'Flexible',                value: 'flexible' },
      ],
    },
  ],
  pest_control: [
    {
      id: 'pest_type',
      type: 'multi',
      question: 'What type of pest problem?',
      hint: 'Select all that apply.',
      options: [
        { label: 'Ants or roaches',     value: 'ants_roaches' },
        { label: 'Rodents (rats/mice)', value: 'rodents' },
        { label: 'Termites',            value: 'termites' },
        { label: 'Mosquitoes',          value: 'mosquitoes' },
        { label: 'Bed bugs',            value: 'bed_bugs' },
        { label: 'Other',               value: 'other', allowText: true },
      ],
    },
    {
      id: 'urgency',
      question: 'How soon do you need treatment?',
      options: [
        { label: 'ASAP — severe infestation', value: 'emergency' },
        { label: 'This week',                 value: 'this_week' },
        { label: 'Flexible',                  value: 'flexible' },
      ],
    },
  ],
  security: [
    {
      id: 'service_type',
      question: 'What security service do you need?',
      options: [
        { label: 'CCTV / camera install',   value: 'cctv' },
        { label: 'Alarm system',            value: 'alarm' },
        { label: 'Smart locks',             value: 'locks' },
        { label: 'Security guard / patrol', value: 'guard' },
        { label: 'Security audit',          value: 'audit' },
      ],
    },
    {
      id: 'property_type',
      question: 'What type of property?',
      options: [
        { label: 'Home',        value: 'home' },
        { label: 'Business',    value: 'business' },
        { label: 'Event venue', value: 'event' },
      ],
    },
  ],
  carpenter: [
    {
      id: 'work_type',
      question: 'What carpentry work do you need?',
      options: [
        { label: 'Custom furniture',      value: 'furniture' },
        { label: 'Cabinets or shelving',  value: 'cabinets' },
        { label: 'Deck or pergola',       value: 'deck' },
        { label: 'Door or window frames', value: 'frames' },
        { label: 'Flooring',              value: 'flooring' },
        { label: 'Other',                 value: 'other', allowText: true },
      ],
    },
    {
      id: 'urgency',
      question: 'When do you need this?',
      options: [
        { label: 'ASAP',       value: 'asap' },
        { label: 'This week',  value: 'this_week' },
        { label: 'This month', value: 'this_month' },
        { label: 'Flexible',   value: 'flexible' },
      ],
    },
  ],
}
