/*
 * HYDROLEVEL FRONTEND CONFIGURATION
 *
 * EDIT THIS FILE when you want to change branding, team details, demo values,
 * analysis defaults, playback speed, or feature labels.
 *
 * Keep calculations in backend/services/analysis.py. This file is for UI/config.
 */
window.HYDROLEVEL_CONFIG = Object.freeze({
  app: {
    name: 'HydroLevel',
    tagline: 'Vehicle Load Intelligence & Digital Twin Platform',
    version: 'V4-NEXTLEVEL-INSURANCE-2026.08.21',
    projectStatus: 'Prototype / Academic Engineering Project'
  },

  branding: {
    hydroLogo: '/assets/hydrolevel-logo.png',
    teamLogo: '/assets/volts-and-bolts-logo.png',
    groupPhoto: '/assets/team-group.png',
    digitalTwinCar: null,
    digitalTwinVehicle: null
  },

  insuranceReview: {
    enabled: true,
    minimumRows: 20,
    maxPostAbnormalRatePercent: 10,
    label: 'INSURANCE REVIEW SUPPORT — NOT A PAYOUT DECISION'
  },

  analysis: {
    positions: ['FL', 'FR', 'RL', 'RR'],
    defaultThresholdKg: 10,
    defaultBlend: 0.50,
    strongBlend: 0.80,
    minimumExportRows: 20,
    playbackMsPerRow: 6000,
    forceConversion: 9.80665
  },

  demo: {
    fl: 382,
    fr: 401,
    rl: 512,
    rr: 497,
    label: 'Illustrative Demo Dataset'
  },

  team: [
    {
      name: 'SAAI VARSHAN S',
      title: 'TEAM LEAD',
      degree: 'B.E. Mechanical Engineering · 3rd Year',
      role: 'Overall project, system architecture, coordination, testing and final decisions.',
      phone: '+91 93422 96487',
      email: 'saaivarshan69@gmail.com',
      linkedin: 'https://www.linkedin.com/in/saai-varshan-8a62b7328',
      photo: '/assets/saai-varshan.png'
    },
    {
      name: 'SUHEERTHAN S',
      title: 'MECHANICAL & VEHICLE DYNAMICS ENGINEER',
      degree: 'B.E. Mechanical Engineering · 3rd Year',
      role: 'Vehicle model, load distribution, suspension/load concepts, mechanical design and CAD.',
      phone: '+91 90433 09288',
      email: 'suheerthan2514@gmail.com',
      linkedin: 'https://www.linkedin.com/in/suheerthan-s-18aa58327/',
      photo: '/assets/suheerthan.png'
    },
    {
      name: 'SANTHOSH R',
      title: 'ELECTRONICS & SENSOR INTEGRATION ENGINEER',
      degree: 'B.E. Mechanical Engineering · 3rd Year',
      role: 'Sensors, wiring, data acquisition, calibration and hardware testing.',
      phone: '+91 97105 81763',
      email: 'santhoshravijv@gmail.com',
      linkedin: 'https://www.linkedin.com/in/santhosh-ravi-95097b328',
      photo: '/assets/santhosh.png'
    }
  ]
});
