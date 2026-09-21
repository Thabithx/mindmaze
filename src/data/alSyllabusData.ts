import { SubjectMeta, SyllabusTopic, TimetableEntry, StreamType } from '../types';

export const SUBJECT_METAS: SubjectMeta[] = [
  // Physical Science (Compulsory)
  {
    id: 'combined-maths',
    name: 'Combined Mathematics',
    stream: 'Physical Science',
    icon: '📐',
    color: 'indigo',
    badgeBg: 'bg-indigo-500/15',
    borderColor: 'border-indigo-500/40',
    textColor: 'text-indigo-400',
  },
  // Compulsory in both Physical Science & Biological Science
  {
    id: 'physics',
    name: 'Physics',
    stream: 'Both',
    icon: '⚡',
    color: 'cyan',
    badgeBg: 'bg-cyan-500/15',
    borderColor: 'border-cyan-500/40',
    textColor: 'text-cyan-400',
  },
  // Compulsory in Biological Science; Elective in Physical Science (Chemistry OR ICT)
  {
    id: 'chemistry',
    name: 'Chemistry',
    stream: 'Both',
    icon: '🧪',
    color: 'purple',
    badgeBg: 'bg-purple-500/15',
    borderColor: 'border-purple-500/40',
    textColor: 'text-purple-400',
  },
  // Elective option in Physical Science (Chemistry OR ICT)
  {
    id: 'ict',
    name: 'ICT',
    stream: 'Physical Science',
    icon: '💻',
    color: 'pink',
    badgeBg: 'bg-pink-500/15',
    borderColor: 'border-pink-500/40',
    textColor: 'text-pink-400',
  },
  // Biological Science (Compulsory - replaces Combined Maths in Bio stream)
  {
    id: 'biology',
    name: 'Biology',
    stream: 'Biological Science',
    icon: '🔬',
    color: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-400',
  },
];

/**
 * Returns the exact 3 subjects for the selected stream:
 * - Physical Science: Combined Mathematics, Physics, and either Chemistry OR ICT
 * - Biological Science: Biology, Chemistry, Physics (Combined Maths replaced with Biology)
 */
export function getSubjectsForStream(
  stream: StreamType | string,
  physicalScienceElective: 'Chemistry' | 'ICT' | string = 'Chemistry'
): SubjectMeta[] {
  if (stream === 'Biological Science' || (stream as string) === 'Bio') {
    return SUBJECT_METAS.filter(
      (s) => s.name === 'Biology' || s.name === 'Chemistry' || s.name === 'Physics'
    );
  }

  // Physical Science
  const elective = physicalScienceElective === 'ICT' ? 'ICT' : 'Chemistry';
  return SUBJECT_METAS.filter(
    (s) =>
      s.name === 'Combined Mathematics' ||
      s.name === 'Physics' ||
      s.name === elective
  );
}

/**
 * Combined Mathematics paper split: Units 1–11 = Pure Mathematics
 * (Paper I), Units 12+ = Applied Mathematics (Paper II).
 * Derived from unitNumber so it applies to already-stored progress with no
 * migration — non-Combined-Maths topics return null.
 */
export function getCombinedMathsGroup(
  topic: Pick<SyllabusTopic, 'subject' | 'unitNumber'>
): 'Pure Mathematics' | 'Applied Mathematics' | null {
  if (topic.subject !== 'Combined Mathematics') return null;
  return topic.unitNumber <= 11 ? 'Pure Mathematics' : 'Applied Mathematics';
}

export const INITIAL_SYLLABUS_TOPICS: SyllabusTopic[] = [
  // ================= COMBINED MATHEMATICS =================
  // PURE MATHEMATICS (PAPER I) — Units 1-11
  {
    id: 'cm-01',
    subject: 'Combined Mathematics',
    unitNumber: 1,
    unitTitle: 'Real Numbers and Inequalities',
    topicTitle: 'Real Numbers and Inequalities',
    subtopics: [
      '1.1 Real number system, intervals and absolute-value properties',
      '1.2 Algebraic and rational inequalities',
      '1.3 Graphical methods for solving modulus inequalities',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-02',
    subject: 'Combined Mathematics',
    unitNumber: 2,
    unitTitle: 'Polynomials and Rational Functions',
    topicTitle: 'Polynomials and Rational Functions',
    subtopics: [
      '2.1 Remainder Theorem and Factor Theorem',
      '2.2 Quadratic functions, discriminant and nature of roots; symmetric functions of roots',
      '2.3 Partial fractions — linear, repeated and quadratic factors',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-03',
    subject: 'Combined Mathematics',
    unitNumber: 3,
    unitTitle: 'Mathematical Induction, Series and Progressions',
    topicTitle: 'Mathematical Induction, Series and Progressions',
    subtopics: [
      '3.1 Principle of Mathematical Induction',
      '3.2 Arithmetic Progression (AP) and Geometric Progression (GP)',
      '3.3 Summation of finite and infinite series using difference method',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-04',
    subject: 'Combined Mathematics',
    unitNumber: 4,
    unitTitle: 'Permutations, Combinations and Binomial Theorem',
    topicTitle: 'Permutations, Combinations and Binomial Theorem',
    subtopics: [
      '4.1 Fundamental counting principles; nPr and nCr identities and applications',
      '4.2 Expansion of (a+b)^n for positive integral n',
      '4.3 General term and middle term in binomial expansions',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-05',
    subject: 'Combined Mathematics',
    unitNumber: 5,
    unitTitle: 'Matrices and Determinants',
    topicTitle: 'Matrices and Determinants',
    subtopics: [
      '5.1 Matrix operations — addition, multiplication, transpose',
      '5.2 Determinants of 2x2 and 3x3 matrices; inverse of a square matrix',
      '5.3 Solving linear systems by matrix inversion and Cramer’s Rule',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-06',
    subject: 'Combined Mathematics',
    unitNumber: 6,
    unitTitle: 'Complex Numbers',
    topicTitle: 'Complex Numbers',
    subtopics: [
      '6.1 Definition z = a + ib, modulus |z|, argument arg(z); conjugate properties and operations',
      '6.2 Argand diagram representations and loci (circles, perpendicular bisectors)',
      '6.3 De Moivre’s Theorem and applications',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-07',
    subject: 'Combined Mathematics',
    unitNumber: 7,
    unitTitle: 'Trigonometry',
    topicTitle: 'Trigonometry',
    subtopics: [
      '7.1 Radian measure, arc length and sector area; compound, double and half-angle formulas',
      '7.2 Product-to-sum and sum-to-product transformations',
      '7.3 Trigonometric equations (a cos x + b sin x = c); inverse trigonometric functions',
      '7.4 Properties and solution of triangles — Sine rule, Cosine rule',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-08',
    subject: 'Combined Mathematics',
    unitNumber: 8,
    unitTitle: 'Limits and Continuity',
    topicTitle: 'Limits and Continuity',
    subtopics: [
      '8.1 Intuitive concept of limit',
      '8.2 Limits involving algebraic, exponential and trigonometric functions',
      '8.3 Continuity of functions',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-09',
    subject: 'Combined Mathematics',
    unitNumber: 9,
    unitTitle: 'Differential Calculus',
    topicTitle: 'Differential Calculus',
    subtopics: [
      '9.1 First principles; product, quotient and chain rules',
      '9.2 Implicit, parametric and logarithmic differentiation',
      '9.3 Tangents, normals and rates of change; turning points, inflexion and curve sketching',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-10',
    subject: 'Combined Mathematics',
    unitNumber: 10,
    unitTitle: 'Integral Calculus',
    topicTitle: 'Integral Calculus',
    subtopics: [
      '10.1 Indefinite integrals and standard forms; substitution, by parts, partial fractions',
      '10.2 Definite integrals and fundamental theorem of calculus',
      '10.3 Area bounded by curves and volumes of revolution',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-11',
    subject: 'Combined Mathematics',
    unitNumber: 11,
    unitTitle: 'Straight Line and Circle',
    topicTitle: 'Straight Line and Circle (Coordinate Geometry)',
    subtopics: [
      '11.1 Distance, section formula, gradient, parallel / perpendicular conditions; line equations, angle between lines, perpendicular distance',
      '11.2 General equation of a circle, centre and radius',
      '11.3 Tangents, normals, orthogonal circles and coaxal systems',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-12',
    subject: 'Combined Mathematics',
    unitNumber: 12,
    unitTitle: 'Vectors',
    topicTitle: 'Vectors',
    subtopics: [
      '12.1 Vector addition, subtraction, dot product and cross product',
      '12.2 Position vectors and resolution of vectors in 2D / 3D space',
    ],
    status: 'not_started',
  },
  // APPLIED MATHEMATICS (PAPER II) — Units 12-18
  {
    id: 'cm-13',
    subject: 'Combined Mathematics',
    unitNumber: 13,
    unitTitle: 'Kinematics',
    topicTitle: 'Kinematics (Motion along Line and Plane)',
    subtopics: [
      '13.1 Rectilinear motion with constant acceleration; displacement-time and velocity-time graphs; motion under gravity',
      '13.2 Relative motion and relative velocity vectors',
      '13.3 Projectiles in a vertical plane',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-14',
    subject: 'Combined Mathematics',
    unitNumber: 14,
    unitTitle: 'Dynamics and Newton’s Laws of Motion',
    topicTitle: 'Dynamics and Newton’s Laws of Motion',
    subtopics: [
      '14.1 Newton’s 1st, 2nd and 3rd laws; connected particles (pulleys, inclined planes, lifts)',
      '14.2 Friction and limiting equilibrium',
      '14.3 Circular motion — horizontal and vertical circular paths',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-15',
    subject: 'Combined Mathematics',
    unitNumber: 15,
    unitTitle: 'Work, Power and Energy',
    topicTitle: 'Work, Power and Energy',
    subtopics: [
      '15.1 Work by constant and variable forces; kinetic and potential energy (gravitational and elastic)',
      '15.2 Conservation of mechanical energy',
      '15.3 Power calculations (P = Fv)',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-16',
    subject: 'Combined Mathematics',
    unitNumber: 16,
    unitTitle: 'Impulse and Direct Impact',
    topicTitle: 'Impulse and Direct Impact',
    subtopics: [
      '16.1 Impulse of a force; conservation of linear momentum',
      '16.2 Direct and oblique collision of elastic spheres; Newton’s Law of Restitution',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-17',
    subject: 'Combined Mathematics',
    unitNumber: 17,
    unitTitle: 'Statics',
    topicTitle: 'Statics',
    subtopics: [
      '17.1 Equilibrium of coplanar forces; Lami’s Theorem and 3-force equilibrium; moments, couples and parallel forces',
      '17.2 Frameworks, joint systems and method of sections (trusses)',
      '17.3 Centre of gravity of lamina, composite bodies and standard shapes',
    ],
    status: 'not_started',
  },
  {
    id: 'cm-18',
    subject: 'Combined Mathematics',
    unitNumber: 18,
    unitTitle: 'Probability and Statistics',
    topicTitle: 'Probability and Statistics',
    subtopics: [
      '18.1 Sample spaces, events and probability axioms; conditional probability and Bayes’ Theorem',
      '18.2 Discrete random variables, expectation E(X) and variance Var(X); Binomial and Normal distributions',
      '18.3 Descriptive statistics — mean, median, variance, standard deviation',
    ],
    status: 'not_started',
  },

  // ================= PHYSICS =================
  // UNIT 1: MEASUREMENT (30 periods • Grade 12)
  {
    id: 'phy-01',
    subject: 'Physics',
    unitNumber: 1,
    unitTitle: 'Measurement',
    topicTitle: 'Measurement',
    subtopics: [
      '1.1 Scope of physics & scientific methodology — subject area, relation to daily life & nature, contribution to society, basic concepts of scientific methodology',
      '1.2 Physical quantities & units — fundamental quantities, SI base & supplementary units, derived quantities & units, dimensionless quantities, multiples & submultiples',
      '1.3 Dimensions — dimensions of mass, length, time; dimensions of derived quantities; uses: testing equations, finding units, deriving expressions',
      '1.4 Measurements & errors — principle, least count & range; systematic & random errors; fractional & percentage error; metre ruler, vernier calipers, micrometer screw gauge, spherometer, travelling microscope, beam / electronic balance, stopwatch, digital multimeter; lab practicals',
      '1.5 Scalars, vectors & resolution — scalar vs vector, geometrical representation, resultant of collinear / parallel vectors, parallelogram law & triangle method, polygon method for systems, resolution of vectors',
    ],
    status: 'not_started',
  },

  // UNIT 2: MECHANICS (110 periods • Grade 12)
  {
    id: 'phy-02',
    subject: 'Physics',
    unitNumber: 2,
    unitTitle: 'Mechanics',
    topicTitle: 'Mechanics',
    subtopics: [
      '2.1 Kinematics — relative motion (same / opposite directions), rectilinear motion under constant acceleration, s-t & v-t graphs, equations of motion, projectile motion under gravity',
      '2.2 Resultant force & moment — resultant of two & coplanar forces, moment about a point, couple, resultant of parallel forces & line of action, centre of gravity (regular & compound bodies), centre of mass, weight by parallelogram law',
      '2.3 Newton’s laws — inertial & gravitational mass, inertial vs non-inertial frames, 1st / 2nd / 3rd laws, F = ma & newton unit, momentum, impulse, conservation of linear momentum, elastic & inelastic collisions, tension, thrust / compression, static / limiting / dynamic friction, free-body diagrams',
      '2.4 Equilibrium — conditions for equilibrium, principle of moments, two-force / coplanar / three non-parallel / three parallel forces, triangle & polygon of forces, stable / unstable / neutral states, weight by principle of moments',
      '2.5 Work, energy & power — work in translation, translational kinetic energy, gravitational & elastic potential energy, power & efficiency, conservation of energy & mechanical energy, work-energy principle',
      '2.6 Rotational & circular motion — angular displacement / velocity / acceleration / frequency, equations under uniform angular acceleration, moment of inertia (rod, ring, disk / cylinder, sphere), angular momentum & conservation, torque & τ = Iα, rotational work & kinetic energy, linear-rotational analogy; uniform circular motion: period, tangential velocity, centripetal acceleration & force',
      '2.7 Hydrostatics — hydrostatic & atmospheric pressure, U-tube / Hare’s apparatus for densities, Pascal’s principle & applications, upthrust & Archimedes’ principle, floatation conditions & principle, hydrometer, weighted test-tube for liquid density',
      '2.8 Fluid dynamics — streamline vs turbulent flow, continuity equation for steady flow, Bernoulli’s principle & applications',
    ],
    status: 'not_started',
  },

  // UNIT 3: OSCILLATIONS AND WAVES (100 periods • Grade 12)
  {
    id: 'phy-03',
    subject: 'Physics',
    unitNumber: 3,
    unitTitle: 'Waves and Oscillations',
    topicTitle: 'Waves and Oscillations',
    subtopics: [
      '3.1 Oscillations & SHM — SHM definition & characteristic equation, amplitude / frequency / period / energy, SHM as projection of uniform circular motion, phase & phase difference, displacement equations & graphs, simple pendulum (g determination), mass-spring oscillations & spring constant, free / damped / forced oscillations & resonance',
      '3.2 Wave motion — transverse vs longitudinal mechanical waves, graphical representation, frequency / wavelength / speed / amplitude, wave speed',
      '3.3 Wave properties — reflection (rigid / soft), refraction, diffraction, polarization, superposition: interference, stationary waves, beats, stationary vs progressive waves',
      '3.4 Stationary waves in strings — stretched-string modes, transverse wave speed, fundamental tone / overtones / harmonics, sonometer (tuning-fork frequency, length-frequency verification), longitudinal wave speed, seismic waves / earthquakes / Richter scale / tsunami',
      '3.5 Air columns — sound speed in air & affecting factors, closed & open tube modes, speed of sound by resonance tube (single & set of tuning forks, graphical method)',
      '3.6 Doppler effect — apparent frequency (observer moving only, source moving only, both moving on same line), sonic boom',
      '3.7 Nature of sound — pitch / loudness / quality, hearing limits (threshold of hearing / pain), intensity & decibel level, intensity-level vs frequency for human ear',
      '3.8 Electromagnetic waves & LASER — EM spectrum, properties & uses, LASER principle / properties / uses',
      '3.9 Refraction — laws, absolute / relative refractive index & relations, real / apparent depth, apparent displacement, travelling-microscope for glass index, critical angle & total internal reflection; prism deviation / deviation graph / minimum deviation & μ relation, critical-angle method, spectrometer adjustments / prism angle / minimum deviation; thin lenses: real / virtual images, lens formula (Cartesian), magnification, focal-length determination, power, contact combinations',
      '3.10 Human eye — image formation, visual angle, short sight / long sight / presbyopia & correction',
      '3.11 Optical instruments — simple microscope (normal adjustment, magnifying power), compound microscope (image at infinity), astronomical telescope (image at near point)',
    ],
    status: 'not_started',
  },

  // UNIT 4: THERMAL PHYSICS (60 periods • Grade 12)
  {
    id: 'phy-04',
    subject: 'Physics',
    unitNumber: 4,
    unitTitle: 'Thermal Physics',
    topicTitle: 'Thermal Physics',
    subtopics: [
      '4.1 Temperature & thermometers — thermal equilibrium, zeroth law, thermometric properties, two-fixed-point formula, Celsius vs absolute (thermodynamic) scale, absolute zero, triple point of water, mercury / alcohol thermometers',
      '4.2 Thermal expansion — linear / area / volume expansion of solids & relations, real vs apparent expansion of liquids, density variation with temperature, anomalous expansion of water',
      '4.3 Gas laws — Boyle’s law (quill tube for atmospheric pressure), Charles’s law (V-T), pressure law (P-T), ideal gas pV = nRT, Dalton’s partial-pressure law',
      '4.4 Kinetic theory of gases — elementary assumptions, mean translational kinetic energy of molecules',
      '4.5 Heat exchange — heat capacity & specific heat (solids / liquids), molar heats of gases, mixtures method for solids, Newton’s law of cooling, cooling method for liquids',
      '4.6 Change of state — molecular account of solids / liquids / gases, fusion & boiling, specific latent heat of fusion (ice by mixtures) & vaporization (water by mixtures), pressure effect on melting & boiling points',
      '4.7 Vapour & humidity — evaporation vs boiling, vapour & saturated vapour pressure (T & V variation), dew point, absolute & relative humidity, polished calorimeter method',
      '4.8 Thermodynamics — heat as energy transfer, internal energy, first law & applications (constant pressure / volume, isothermal, adiabatic, cyclic), P-V curves',
      '4.9 Heat transfer — conduction (conductivity, rate equation, lagged / non-lagged rods, Searle’s method), convection, radiation',
    ],
    status: 'not_started',
  },

  // UNIT 5: GRAVITATIONAL FIELD (20 periods • Grade 13)
  {
    id: 'phy-05',
    subject: 'Physics',
    unitNumber: 5,
    unitTitle: 'Gravitational Field',
    topicTitle: 'Gravitational Field',
    subtopics: [
      '5.1 Newtonian gravitation — field concept, force between masses, universal law, field intensity (point mass & outside spherical mass), intensity variation graphs, potential & potential at distance r, potential energy, potential-distance graphs',
      '5.2 Earth’s field & satellites — field intensity near surface, g vs field-intensity relation, Earth satellites, geostationary satellites, escape velocity',
    ],
    status: 'not_started',
  },

  // UNIT 6: ELECTRIC FIELD (60 periods • Grade 13)
  {
    id: 'phy-06',
    subject: 'Physics',
    unitNumber: 6,
    unitTitle: 'Electrostatic Field',
    topicTitle: 'Electrostatic Field',
    subtopics: [
      '6.1 Electrostatic force & field — Coulomb’s law, field intensity, field lines (point charge, two charges, parallel plates), intensity variation graphs',
      '6.2 Flux model & Gauss’s theorem — electric flux, Gauss’s theorem, applications: point charge, infinite plate, conducting sphere (outside / on / inside), infinitely long thin wire',
      '6.3 Electric potential — definition, potential due to point charge & charge distributions, potential difference, work across p.d., potential energy (single & two-charge systems), potential gradient & E-V relation, equipotential surfaces (point / like / unlike charges)',
      '6.4 Capacitance & capacitors — definition, parallel-plate derivation, spherical-conductor capacitance, series / parallel combinations, energy stored (derivation), charge distribution & corona / point discharge',
    ],
    status: 'not_started',
  },

  // UNIT 7: MAGNETIC FIELD (40 periods • Grade 13)
  {
    id: 'phy-07',
    subject: 'Physics',
    unitNumber: 7,
    unitTitle: 'Magnetic Field',
    topicTitle: 'Magnetic Field',
    subtopics: [
      '7.1 Magnetic force — force on current-carrying conductor (magnitude, flux density, Fleming’s left-hand rule), force on moving charge (magnitude / direction), Hall effect (qualitative + Hall-voltage derivation)',
      '7.2 Field production — Biot-Savart law, Maxwell’s corkscrew rule, field near long straight wire, at centre of circular coil, along long solenoid axis, force between parallel conductors, ampere definition',
      '7.3 Torque & motors — torque on rectangular coil (uniform & radial fields), moving-coil galvanometer (deflection, sensitivity factors), DC motor',
    ],
    status: 'not_started',
  },

  // UNIT 8: CURRENT ELECTRICITY (70 periods • Grade 13)
  {
    id: 'phy-08',
    subject: 'Physics',
    unitNumber: 8,
    unitTitle: 'Current Electricity',
    topicTitle: 'Current Electricity',
    subtopics: [
      '8.1 Fundamentals — charge & current, conduction in metals, current–drift velocity relation, current density, p.d., resistance & resistivity, temperature variation & coefficient, superconductors (behaviour / materials / properties / uses), series / parallel resistors, Ohm’s law & validity, I-V curves (ohmic / non-ohmic), potential divider',
      '8.2 Energy & power — energy dissipation & power expressions, VI / I²R / V²R applications (general vs Joule-heating-only appliances)',
      '8.3 EMF & internal resistance — cell p.d. formation, energy transformations in EMF sources, EMF definition, internal resistance, energy conservation in circuits, terminal p.d., graphical EMF / r determination, series / parallel source combinations, R vs power graphs, maximum power-transfer condition',
      '8.4 Circuits & Kirchhoff’s laws — electric circuits, 1st law (charge) & 2nd law (energy)',
      '8.5 Measuring instruments — ammeter / voltmeter / multimeter, Wheatstone bridge balance condition, meter bridge (precautions, uses incl. temperature coefficient), potentiometer (principle, calibration, precautions, EMF comparison & internal resistance, pros / cons)',
      '8.6 EMI, AC & transformers — flux & flux linkage, Faraday’s & Lenz’s laws & demonstrations, induced EMF in moving / rotating rod, rotating disc, rotating coil (max value), AC generator (arrangement, EMF-time graph, rms / peak values, power in resistive circuits); eddy currents & uses; motor back-EMF (demonstration, armature-current effect, starter); transformers (structure, turns-voltage relation, step-up / down, VI power, Joule / eddy losses & minimization, uses); power transmission',
    ],
    status: 'not_started',
  },

  // UNIT 9: ELECTRONICS (40 periods • Grade 13)
  {
    id: 'phy-09',
    subject: 'Physics',
    unitNumber: 9,
    unitTitle: 'Electronics',
    topicTitle: 'Electronics',
    subtopics: [
      '9.1 Diodes — intrinsic / extrinsic (n / p) semiconductors, p-n junction & depletion layer, forward / reverse bias, ideal vs practical I-V, half / full-wave rectification, smoothing, CRO demonstration, diode as switch; Zener regulation, LED, photodiode',
      '9.2 Transistors — bipolar npn / pnp structure & symbols, CB / CE / CC configurations, CE input / transfer / output characteristics, biasing, CE amplifier (current / voltage gain), CE switch; JFET (p / n-channel structure, n-channel action & characteristics)',
      '9.3 Op-amps — IC op-amp, pin identification, open-loop characteristics, closed-loop voltage amplifier, golden rules I & II, inverting & non-inverting amplifiers, comparator / switch use',
      '9.4 Digital logic — AND / OR / NOT / NAND / NOR / EXOR / EXNOR expressions & truth tables, basic-gate investigation, ≤3-input circuit expressions, expression-to-circuit & truth-table-to-expression conversion, simple logic design, NOR-based memory & SR flip-flop (bistable)',
    ],
    status: 'not_started',
  },

  // UNIT 10: MECHANICAL PROPERTIES OF MATTER (40 periods • Grade 13)
  {
    id: 'phy-10',
    subject: 'Physics',
    unitNumber: 10,
    unitTitle: 'Mechanical Properties of Matter',
    topicTitle: 'Mechanical Properties of Matter',
    subtopics: [
      '10.1 Elasticity — tension & extension, load-extension graph, tensile stress / strain, Young modulus, stress-strain graph, Hooke’s law, Young modulus by wire experiment, energy in stretched wire',
      '10.2 Viscosity — viscous force & coefficient F = Aη(v1-v2)/d, Poiseuille’s equation (validity, dimensional check, η determination), Stokes’ law (dimensional check), terminal-velocity derivations (upward / downward motion)',
      '10.3 Surface tension — definition, angle of contact & meniscus nature, free surface energy, work for isothermal area increase, surface energy-tension relation, pressure difference across spherical meniscus, capillary-rise expression, determination (microscope slide, capillary rise, Jaeger’s method)',
    ],
    status: 'not_started',
  },

  // UNIT 11: MATTER AND RADIATION (30 periods • Grade 13)
  {
    id: 'phy-11',
    subject: 'Physics',
    unitNumber: 11,
    unitTitle: 'Matter and Radiation',
    topicTitle: 'Matter and Radiation',
    subtopics: [
      '11.1 Black-body radiation — quantum nature, Stefan’s law & non-black modification, intensity distribution, Wien’s displacement law, classical failure, Planck’s hypotheses',
      '11.2 Photoelectric effect — threshold frequency, I-V graphs, stopping potential, frequency–stopping-potential graphs (different metals), classical failure, Einstein’s photon hypotheses, work function, Einstein equation, work-function–threshold & stopping-potential–Kmax relations',
      '11.3 Wave-particle duality — de Broglie wavelength for matter waves, evidence for matter waves, electron-microscope principle',
      '11.4 X-rays — production, properties, uses',
      '11.5 Radioactivity — α / β / γ emission, disintegration law & graphs, decay constant, activity, half-life, uses (C-14 dating, medicine / engineering / agriculture), hazards & safety, dose (Gy), RBE / quality factor, effective dose (Sv), exposure-time & body-area factors',
      '11.6 Nuclear energy — nucleus & stability, unified atomic mass unit, mass defect, E = mc², binding energy & binding-per-nucleon vs atomic-number graph, chemical vs nuclear energy, fission, atomic bomb & power-station action, fusion conditions, solar fusion & power-production attempts',
      '11.7 Particle physics — probing matter structure, high-energy need, accelerators & detectors, elementary particles (quarks / leptons), fundamental interactions (gravitational, electromagnetic, strong, weak)',
    ],
    status: 'not_started',
  },

  // ================= CHEMISTRY =================
  // UNIT 01 — ATOMIC STRUCTURE (Grade 12)
  {
    id: 'chem-01',
    subject: 'Chemistry',
    unitNumber: 1,
    unitTitle: 'Atomic Structure',
    topicTitle: 'Atomic Structure',
    subtopics: [
      '1.1 Models of atomic structure — cathode-ray properties, sub-atomic particles, Rutherford model, atomic / mass number, isotopes, nuclides, relative atomic mass',
      '1.2 Electromagnetic radiation — wave-particle duality, c = νλ, E = hν, λ = h/mv, EM spectrum',
      '1.3 Electronic energy levels — successive ionization energies, Bohr theory, hydrogen spectrum & quantization, orbitals s/p/d/f',
      '1.4 Quantum numbers — principal (n), azimuthal (l), magnetic (ml), spin (ms); shapes of s and p orbitals',
      '1.5 Electronic configuration — max electrons per sub-level, Hund / Pauli / Aufbau (incl. deviations to Z=54), stable s2/p3/p6/d5/d10; periodic table s/p/d/f blocks (groups 1-18); trends: atomic radius, ionization energy, electron gain, electronegativity (Pauling), shielding / effective nuclear charge, cation / anion formation',
    ],
    status: 'not_started',
  },
  // UNIT 02 — BONDING AND STRUCTURE (Grade 12)
  {
    id: 'chem-02',
    subject: 'Chemistry',
    unitNumber: 2,
    unitTitle: 'Bonding and Structure',
    topicTitle: 'Bonding and Structure',
    subtopics: [
      '2.1 Primary interactions — covalent (single / multiple), Lewis dot-cross/dot-dot/dot-dash structures, electronegativity & polarity, dipole moment, non-polar vs polar covalent (H2, Cl2, O2, N2, HCl, H2O, NH3), coordinate / dative (H3O+, NH4+, NH3BF3), ionic lattice, covalent character (polarizing power / polarizability), metallic bonding',
      '2.2 Molecular shapes — resonance, hybridization sp/sp2/sp3 (2nd period, central atom only), σ and π bonds, VSEPR (up to 6 electron pairs): linear, trigonal planar, tetrahedral, pyramidal, angular, trigonal bipyramid, see-saw, T-shaped, octahedral, square pyramid, square planar; electronegativity vs charge / hybridization / oxidation number; model building',
      '2.3 Intermolecular forces — dipole-dipole, ion-dipole, hydrogen bonding, ion-induced / dipole-induced dipole, London dispersion (qualitative); molecular lattices (I2, H2O)',
    ],
    status: 'not_started',
  },
  // UNIT 03 — CHEMICAL CALCULATIONS (Grade 12)
  {
    id: 'chem-03',
    subject: 'Chemistry',
    unitNumber: 3,
    unitTitle: 'Chemical Calculations',
    topicTitle: 'Chemical Calculations',
    subtopics: [
      '3.1 Mole concept & stoichiometry — oxidation number, formulae & IUPAC / common names, moles / molar mass / Avogadro, empirical & molecular formulae; composition: mass & volume fraction, w/w% & v/v%, ppm / ppb, mole fraction, molarity (mol dm-3), solution preparation; glassware & four-beam balance',
      '3.2 Balancing equations — inspection method, redox (oxidation-number & half-ionic methods), simple nuclear reactions',
      '3.3 Stoichiometric calculations — acid-base & redox, precipitation (gravimetry), solution preparation',
    ],
    status: 'not_started',
  },
  // UNIT 04 — STATE OF MATTER; GASEOUS STATE (Grade 12)
  {
    id: 'chem-04',
    subject: 'Chemistry',
    unitNumber: 4,
    unitTitle: 'Gaseous State',
    topicTitle: 'State of Matter; Gaseous State',
    subtopics: [
      '4.1 Three states of matter — solid / liquid / gas particle arrangement and movement; volume, density, shape / gravity, compressibility comparison',
      '4.2 Ideal gas model — ideal-gas equation (P,V,T,n; P=CRT, PV=m/M·RT, PM=dRT), Boyle / Charles / Avogadro laws & consistency, molar volume & experimental determination (incl. Mg relative atomic mass via H2)',
      '4.3 Kinetic molecular theory — pressure of a gas, mean / mean-square / rms speed, PV = 1/3 mNC² (no derivation), Maxwell-Boltzmann distribution (T & molar-mass variation, graphical)',
      '4.4 Dalton’s partial-pressure law — total vs partial pressure, gaseous mixtures',
      '4.5 Real gases — compressibility factor, deviations (molecular interactions & volume), van der Waals corrections (qualitative), critical temperature',
    ],
    status: 'not_started',
  },
  // UNIT 05 — ENERGETICS (Grade 12)
  {
    id: 'chem-05',
    subject: 'Chemistry',
    unitNumber: 5,
    unitTitle: 'Energetics',
    topicTitle: 'Energetics',
    subtopics: [
      '5.1 Concepts — extensive / intensive properties, system / surroundings / boundary, standard states, state functions, heat & enthalpy (ΔH, kJ & kJ mol-1, standard ΔH°)',
      '5.2 Enthalpy changes — Q = mcΔT, endothermic vs exothermic, formation / combustion / bond dissociation (mean) / neutralization / hydration / solution; enthalpy diagrams vs cycles; Hess’s law & calculations; experimental neutralization enthalpies (NaOH/HCl, KOH/HNO3, NaOH/CH3COOH, NH4OH/HCl); Hess validation',
      '5.3 Born-Haber cycles — lattice enthalpy via sublimation / vaporization / fusion / atomization / ionization / electron-gain enthalpies',
      '5.4 Spontaneity — entropy (S, ΔS), Gibbs energy (G, ΔG = ΔH − TΔS; ΔG° = ΔH° − TΔS°); ΔG < 0 spontaneous, = 0 equilibrium, > 0 non-spontaneous',
    ],
    status: 'not_started',
  },
  // UNIT 06 — CHEMISTRY OF S, P AND D BLOCK ELEMENTS (Grade 12)
  {
    id: 'chem-06',
    subject: 'Chemistry',
    unitNumber: 6,
    unitTitle: 'Chemistry of s, p and d Block Elements',
    topicTitle: 'Chemistry of s, p and d Block Elements',
    subtopics: [
      '6.1 s-block — occurrence (Na, K, Mg, Ca); reactions with water / air-O2 / N2 / H2 / acids & comparison; flame tests (Li, Na, K, Ca, Ba, Sr)',
      '6.2 p-block elements & compounds — occurrence (C, N, O; groups 13-18); Al / Al2O3 amphoteric, AlCl3 electron deficiency; carbon allotropes (diamond, graphite, fullerene), oxides & oxoacids; nitrogen oxidation numbers, oxoacids / oxides, HNO3 with metals & non-metals (Mg, Cu, C, S); ammonia redox (Na, Mg, Cl2, CuO), ammonium-salt thermal decomposition; O/S allotropes, oxoacids (H2SO4, H2SO3, H2S2O3), H2SO4 reactions, H2O amphiprotic, H2O2/H2S/SO2 redox; halogens: Cl2 with Cu/Fe/NH3, displacement, disproportionation (Cl2, ClO−), chlorine oxoacids; halide acidity; xenon fluorides; anion identification (halides, SO42−, SO32−, S2O32−, S2−, CO32−, NO3−, NO2−); N2 in air experiment; thiosulphate standardization (KIO3/KI); NH3/NH4+ tests (litmus, HCl, Nessler)',
      '6.3 Trends in s/p compounds — solubility & thermal stability of hydroxides / carbonates / bicarbonates / nitrates / nitrites / halides / sulphates etc. down groups; acid / base / amphoteric oxides-hydroxides across period 3; hydride & halide hydrolysis (period 3, group 15); lab tests for solubility & thermal stability',
      '6.4 d-block elements — occurrence & uses (Cu, Fe, Ti); vs s/p: configurations & variable oxidation states, electronegativity, metallic character, catalysis, coloured compounds & aqueous complex-ion colours',
      '6.5 d-block compounds — acidic / basic / amphoteric Cr & Mn oxides; CrO42− / Cr2O72− / MnO4− as oxidants; Fe2+ titration with acidified KMnO4 (standardized via K2C2O4)',
      '6.6 Complexes — Cr/Mn/Fe/Co/Ni/Cu with H2O & Cl− (colours, IUPAC names); cations (Cr3+, Mn2+, Fe2+, Fe3+, Co2+, Ni2+, Cu2+, Zn2+) with NaOH & NH3(aq); colours of Cu(II)/Ni(II)/Co(II) with HCl & NH3; Mn oxidation states (+2/+4/+6/+7) via redox; Ni2+/Fe2+/Fe3+/Cu2+/Cr3+ identification',
    ],
    status: 'not_started',
  },
  // UNIT 07 — BASIC CONCEPTS OF ORGANIC CHEMISTRY (Grade 12)
  {
    id: 'chem-07',
    subject: 'Chemistry',
    unitNumber: 7,
    unitTitle: 'Basic Concepts of Organic Chemistry',
    topicTitle: 'Basic Concepts of Organic Chemistry',
    subtopics: [
      '7.1 Importance of organic chemistry — why so many organic compounds; everyday importance',
      '7.2 Functional-group families — aliphatic vs aromatic (benzene), alkyl / aryl halides, alcohols / phenols, ethers, aldehydes / ketones, carboxylic acids, acid chlorides, esters, amides, aliphatic & aryl amines, amino acids',
      '7.3 IUPAC nomenclature — trivial names; C≤6 main chain, saturated unbranched C side chains only, ≤1 C=C/C≡C in main chain, ≤2 substituents (−F/−Cl/−Br/−I/−CH3/−CH2CH3/−OH/−NH2/−NO2/−CN/−CHO/>C=O as substituents; −OH/−CHO/>C=O/−COOH/−COX/−COOR/−NH2/−CONH2 as principal group, occurring once; aromatics not tested)',
      '7.4 Isomerism — constitutional (chain / position / functional-group); stereoisomers: diastereomers via geometrical isomers only',
    ],
    status: 'not_started',
  },
  // UNIT 08 — HYDROCARBONS AND HALOHYDROCARBONS (Grade 12)
  {
    id: 'chem-08',
    subject: 'Chemistry',
    unitNumber: 8,
    unitTitle: 'Hydrocarbons and Halohydrocarbons',
    topicTitle: 'Hydrocarbons and Halohydrocarbons',
    subtopics: [
      '8.1 Aliphatic hydrocarbons (acyclic) — alkanes / alkenes / alkynes, homologous series, intermolecular forces & mp/bp, carbon hybridization sp3/sp2/sp, geometries',
      '8.2 Alkane / alkene / alkyne reactions — alkane inertness & free-radical chlorination (methane mechanism, homolysis); alkene electrophilic addition: HX (carbocations, 1°/2°/3° stability, HBr-peroxide anomaly), Br2 (propene mechanism), H2SO4 then hydrolysis, catalytic hydrogenation, cold alkaline KMnO4 (Baeyer); alkyne addition: Br2, HX, H2O (Hg2+/H2SO4), catalytic & partial hydrogenation; terminal-alkyne acidity & reactions (Na, NaNH2, ammoniacal CuCl / AgNO3); observations with KMnO4, bromine water, Ag+/Cu+ reagents',
      '8.3 Benzene structure — carbon hybridization, delocalization, resonance, stability',
      '8.4 Benzene reactions — substitution over addition; electrophilic nitration / alkylation / acylation / halogenation (FeX3) with mechanisms; oxidation resistance, alkyl/acyl-benzene oxidation (H+/KMnO4, H+/K2Cr2O7), catalytic hydrogenation difficulty',
      '8.5 Directing effects — ortho/para (−OH, −NH2, −NHR, −R, −Cl, −Br, −OCH3); meta (−COOH, −CHO, −COR, −NO2)',
      '8.6 Alkyl halides — 1°/2°/3° classification, C−X polarity (F/Cl/Br/I), mp/bp/solubility, SN vs elimination, nucleophiles (OH−, CN−, acetylide, RO−), aryl/vinyl inertness; Grignard preparation (anhydrous need, M−C nature) & reactions with proton donors (water, acids, alcohols, phenols, amines, terminal alkynes)',
      '8.7 Ethene / ethyne preparation & uses; one-step vs two-step (carbocation intermediate) pathways',
    ],
    status: 'not_started',
  },
  // UNIT 09 — OXYGEN CONTAINING ORGANIC COMPOUNDS (Grade 12)
  {
    id: 'chem-09',
    subject: 'Chemistry',
    unitNumber: 9,
    unitTitle: 'Oxygen Containing Organic Compounds',
    topicTitle: 'Oxygen Containing Organic Compounds',
    subtopics: [
      '9.1 Alcohols — 1°/2°/3° classification, bp & solubility, O−H cleavage (Na, esterification), C−O cleavage (HBr/HI, PCl3/PBr3, PCl5, Lucas ZnCl2/conc. HCl via carbocation stability; benzyl alcohol excluded), dehydration (conc. H2SO4 / Al2O3), oxidation (H+/KMnO4, H+/K2Cr2O7, PCC to aldehyde / ketone); tests',
      '9.2 Phenol — hydroxybenzene structure, higher acidity vs alcohols, reactions with Na & NaOH, non-reactivity under alcohol SN conditions; tests',
      '9.3 Phenol ring activation — electrophilic bromination & nitration via −OH effect',
      '9.4 Aldehydes & ketones — >C=O polarity & unsaturation; nucleophilic addition (HCN, Grignard with mechanisms; 2,4-DNP/Brady addition-elimination; base self-condensation); reduction (NaBH4 / LiAlH4 then hydrolysis; Clemmensen Zn(Hg)/conc. HCl); aldehyde oxidation (Tollens, Fehling, H+/KMnO4, H+/K2Cr2O7 vs ketone inertness); tests',
      '9.5 Carboxylic acids — H-bonding, mp/bp, solubility, dimers; −COOH vs >C=O / −OH reactivity; O−H cleavage acidity (vs alcohols / phenol via conjugate-base stability) & reactions (Na, NaOH, NaHCO3/Na2CO3); C−O cleavage (PCl3/PCl5, esterification with alcohols); LiAlH4 reduction; tests',
      '9.6 Acid derivatives — acid chlorides (aqueous NaOH mechanism; water, NH3, 1° amines, alcohols, phenol); esters (dilute acid, aqueous NaOH, Grignard, LiAlH4); amides (LiAlH4 reduction)',
    ],
    status: 'not_started',
  },
  // UNIT 10 — NITROGEN CONTAINING ORGANIC COMPOUNDS (Grade 12)
  {
    id: 'chem-10',
    subject: 'Chemistry',
    unitNumber: 10,
    unitTitle: 'Nitrogen Containing Organic Compounds',
    topicTitle: 'Nitrogen Containing Organic Compounds',
    subtopics: [
      '10.1 Amines & aniline — aliphatic vs aromatic, 1°/2°/3° amines; aniline bromination; 1°-amine reactions (alkyl halides, aldehydes / ketones, acid chlorides, nitrous acid)',
      '10.2 Basicity — amines vs alcohols; 1° aliphatic vs aniline; amines vs amides',
      '10.3 Diazonium salts — replacement reactions (water, H3PO2, CuCl / CuCN / CuBr, KI); coupling as electrophile with phenol & 2-naphthol',
    ],
    status: 'not_started',
  },
  // UNIT 11 — CHEMICAL KINETICS (Grade 13)
  {
    id: 'chem-11',
    subject: 'Chemistry',
    unitNumber: 11,
    unitTitle: 'Chemical Kinetics',
    topicTitle: 'Chemical Kinetics',
    subtopics: [
      '11.1 Reaction rate — rate via concentrations (aA + bB → cC + dD), reactant vs product rates; factors: temperature, concentration / pressure, surface area, catalysts',
      '11.2 Order, rate expression & constant — single-step energy diagram & activation energy; collision / orientation / activation requirements; temperature effect',
      '11.3 Concentration control — initial / instantaneous / average rates; rate law, order & constant, zeroth / first / second order, first-order half-life (graphical, no equation); initial-rate method; experiments: Mg–acid concentration effect, Na2S2O3–HNO3 concentration effect',
      '11.4 Physical nature & catalysts — explanations of rate effects',
      '11.5 Mechanisms — elementary vs multistep, energy diagrams, transition state & intermediates, rate-determining step; experiment: order in Fe3+ for Fe3+ + I−',
    ],
    status: 'not_started',
  },
  // UNIT 12 — EQUILIBRIUM (Grade 13)
  {
    id: 'chem-12',
    subject: 'Chemistry',
    unitNumber: 12,
    unitTitle: 'Equilibrium',
    topicTitle: 'Equilibrium',
    subtopics: [
      '12.1 Equilibrium law — dynamic reversibility; chemical / ionic / solubility / phase / electrode equilibria (heterogeneous & homogeneous); equilibrium constant; Kc, Kp, Q; Kp = Kc(RT)^Δn; equilibrium point & Le Chatelier factors; experiments: Fe3+/SCN− dynamics, NO2/N2O4 temperature effect',
      '12.2 Ionic equilibria — acid-base theories, conjugates; Kw, Ka, Kb; Ostwald dilution & pH (monobasic acids, monoacidic bases, salts); acid-base titrations, curves, indicators & pK-based selection, equivalence-point visuals; salt-solution pH tests; Na2CO3–HCl titration (phenolphthalein & methyl orange)',
      '12.3 Buffers — qualitative & quantitative, Henderson equation (monobasic / monoacidic, no quadratics), buffer pH',
      '12.4 Sparingly soluble salts — Ksp vs ionic product, precipitation, solubility, common-ion effect; qualitative cation group analysis; experimental Ksp of Ca(OH)2',
      '12.5 Single-component phase equilibria — liquid-vapour molecular view, saturated vapour pressure & boiling point, vapour-pressure vs T, critical temperature, water phase diagram & triple point',
      '12.6 Binary liquid-vapour systems — totally miscible systems, Raoult’s law, ideal vs non-ideal solutions, vapour-pressure–composition & T–composition diagrams (excl. azeotropes), fractional distillation',
      '12.7 Immiscible-liquid distribution — partition coefficient; experiment: ethanoic acid between water & 2-butanol',
    ],
    status: 'not_started',
  },
  // UNIT 13 — ELECTROCHEMISTRY (Grade 13)
  {
    id: 'chem-13',
    subject: 'Chemistry',
    unitNumber: 13,
    unitTitle: 'Electrochemistry',
    topicTitle: 'Electrochemistry',
    subtopics: [
      '13.1 Conductivity — electrolyte types, conductance (1/R), conductivity κ = l/AR; factors: solute nature (strong / weak / non-electrolytes, molten), concentration, temperature',
      '13.2 Electrode potentials & series — reversible electrodes (metal–ion, metal–insoluble salt, gas O2/H2/Cl2, redox Pt|Fe3+/Fe2+); liquid junction, salt bridge, separator; cells without junction; cell reactions & EMF; E & standard E° (E°cell = E°cathode − E°anode, no Nernst); Daniell cell; electrochemical series, metal occurrence / extraction relations; metal-activity experiments; Ag/AgCl/Cl− standard electrode',
      '13.3 Electrolysis & Faraday — principles; water electrolysis; aqueous CuSO4/CuCl2 with Cu electrodes; aqueous CuSO4 with Pt; aqueous NaCl/Na2SO4 with carbon; molten NaCl (principle); Faraday-constant calculations',
    ],
    status: 'not_started',
  },
  // UNIT 14 — INDUSTRIAL CHEMISTRY AND ENVIRONMENTAL POLLUTION (Grade 13)
  {
    id: 'chem-14',
    subject: 'Chemistry',
    unitNumber: 14,
    unitTitle: 'Industrial Chemistry and Environmental Pollution',
    topicTitle: 'Industrial Chemistry and Environmental Pollution',
    subtopics: [
      '14.1 s-block industries — plant-design factors, raw-material selection; Mg from bittern (Dow), NaOH (membrane cell), soap, Na2CO3 (Solvay); lab soap preparation',
      '14.2 Bulk chemicals — ammonia (Haber), nitric acid (Ostwald), sulphuric acid (Contact); uses',
      '14.3 d-block industries — TiO2 from rutile (chloride process); iron in blast furnace; uses',
      '14.4 Polymers — addition vs condensation (polythene, PVC, polystyrene, Teflon; polyesters, nylon; Bakelite; additives; natural polymers); natural rubber structure / properties / uses, latex coagulation & prevention, vulcanization',
      '14.5 Plant-based industries — ethanol, vinegar, biodiesel; steam distillation of essential oils (no specific structures); uses; lab cinnamon-oil distillation, biodiesel preparation, vinegar acetic-% determination',
      '14.6 Air pollution — quality parameters (COx, NOx, SOx, CxHy, particulates); acid rain, photochemical smog, ozone depletion, global warming',
      '14.7 Water pollution — quality parameters (pH, temperature, conductivity, turbidity, hardness, DO, COD); eutrophication (NO3−, PO43− from fertilizers); organic effluents (e.g. latex); heavy metals (Cd, As, Pb, Hg); COD vs DO; thermal pollution; acidity / basicity; turbidity & hardness; Winkler DO determination',
    ],
    status: 'not_started',
  },

  // ================= BIOLOGY =================
  // UNIT 01 — INTRODUCTION TO BIOLOGY (5 periods • Grade 12)
  {
    id: 'bio-01',
    subject: 'Biology',
    unitNumber: 1,
    unitTitle: 'Introduction to Biology',
    topicTitle: 'Introduction to Biology',
    subtopics: [
      '1.1 Nature, scope & importance — biological diversity, human body, plant life, resources & environment, food production, diseases, legal & ethical issues; challenges faced by mankind',
      '1.2 Organization of life — diversity (size, shape, form, habitat); characteristics: order, metabolism, growth, irritability, adaptation, reproduction, heredity & evolution; hierarchy molecules → organelles → cells → tissues → organs → systems → organism → population → community → ecosystem → biosphere; cell as basic unit',
    ],
    status: 'not_started',
  },
  // UNIT 02 — CHEMICAL AND CELLULAR BASIS OF LIFE (80 periods • Grade 12)
  {
    id: 'bio-02',
    subject: 'Biology',
    unitNumber: 2,
    unitTitle: 'Chemical and Cellular Basis of Life',
    topicTitle: 'Chemical and Cellular Basis of Life',
    subtopics: [
      '2.1 Biomolecules & water — elemental composition; water properties for life; carbohydrates (mono/di/polysaccharides, reducing vs non-reducing), lipids (triglycerides, phospholipids, steroids), proteins (1°-4° structure, properties), nucleic acids (nucleosides/nucleotides, DNA double helix, RNA, ADP/ATP/NAD+/NADP+/FAD); lab tests for sugars, starch, proteins, lipids',
      '2.2 Microscopy & cells — light vs electron (SEM/TEM), magnification & resolution, parts & use; cell theory; prokaryotic vs eukaryotic; plant vs animal cell; plasma membrane, cytoplasm, nucleus, ribosomes, RER/SER, Golgi, lysosomes, peroxisomes/glyoxysomes, mitochondria, chloroplasts, cytoskeleton, vacuoles, flagella/cilia, centriole, wall, junctions, ECM; reading electron micrographs',
      '2.3 Cell cycle & division — chromosomes (chromatin, chromatids, kinetochore), mitosis stages & significance, meiosis (crossing over, independent assortment, homologue & sister-chromatid separation) & significance; galls, tumours, cancers; slide identification of mitosis / meiosis',
      '2.4 Metabolism & enzymes — energy need, anabolic vs catabolic, body-size/activity/environment, ATP structure & importance, electron carriers (NAD+, NADP+, FAD); enzyme characteristics, induced-fit, cofactors/coenzymes/inorganic ions; pH/temperature/substrate/inhibitors (competitive/non-competitive), allosteric & feedback inhibition; starch-amylase temperature experiment',
      '2.5 Photosynthesis — pigments & photosystems, light reactions (NADPH & ATP), Calvin cycle (carboxylation by RUBP carboxylase, PGA reduction, RUBP regeneration), photorespiration, C3 vs C4 pathways & leaf anatomy, limiting factors (CO2, light, temperature); Audus-apparatus rate experiments; C3/C4 leaf sections',
      '2.6 Cellular respiration — aerobic vs anaerobic; glycolysis, pyruvate oxidation & Krebs cycle, electron transport chain; ethanol & lactic fermentation; lipids/proteins as substrates; respiratory quotient; germinating-seed rate & RQ experiments',
    ],
    status: 'not_started',
  },
  // UNIT 03 — EVOLUTION AND DIVERSITY OF ORGANISMS (60 periods • Grade 12)
  {
    id: 'bio-03',
    subject: 'Biology',
    unitNumber: 3,
    unitTitle: 'Evolution and Diversity of Organisms',
    topicTitle: 'Evolution and Diversity of Organisms',
    subtopics: [
      '3.1 Origin & evolution of life — early-Earth conditions; eons (Hadean, Archaean, Proterozoic, Phanerozoic) & eras (Paleozoic, Mesozoic, Cenozoic); biochemical evolution, protocell, photosynthesis & eukaryote origins, diversification; Lamarck, Darwin-Wallace natural selection, Neo-Darwinism',
      '3.2 Classification — identification, natural vs artificial classification, binomial nomenclature; 3-kingdom vs 5-kingdom vs domains; taxa hierarchy domains→species; biological & other species concepts; dichotomous keys',
      '3.3 Bacteria, Archaea & Protista — Bacteria/cyanobacteria (size, distribution, flagella, wall, nutrition, pigments, reproduction; light & EM observation); Protista: Euglena, Paramecium, Amoeba, Ulva, Gelidium, Sargassum, diatoms with observations',
      '3.4 Plantae — plant-group evolution; non-vascular (Hepatophyta, Bryophyta, Anthocerophyta); seedless vascular (Lycophyta, Pterophyta); seeded vascular (Cycadophyta, Gnetophyta, Coniferophyta, Anthophyta: monocots/dicots); representative observations',
      '3.5 Fungi — organization, wall, nutrition, vegetative structures, reproduction; Chytridiomycota (Allomyces), Zygomycota (Mucor), Ascomycota (Aspergillus), Basidiomycota (Agaricus) with observations',
      '3.6 Animalia (invertebrates) — organization, nutrition, reproduction; Cnidaria, Platyhelminthes, Nematoda, Annelida, Arthropoda, Mollusca, Echinodermata (habitat, nutrition, respiration, reproduction, excretion, unique features) with observations',
      '3.7 Chordata — phylum features; Chondrichthyes, Osteichthyes, Amphibia, Reptilia, Aves, Mammalia (skeleton, skin, locomotion, respiration, reproduction, habitat, thermoregulation) with observations',
    ],
    status: 'not_started',
  },
  // UNIT 04 — PLANT FORM AND FUNCTION (80 periods • Grade 12)
  {
    id: 'bio-04',
    subject: 'Biology',
    unitNumber: 4,
    unitTitle: 'Plant Form and Function',
    topicTitle: 'Plant Form and Function',
    subtopics: [
      '4.1 Tissues & growth — meristems (apical/lateral/intercalary), shoot/root apex, primary differentiation; dermal (epidermis, guard cells, trichomes, root hairs), ground (parenchyma, collenchyma, sclerenchyma), vascular (xylem, phloem); monocot/dicot stem & root primary structure; secondary growth, wood rings, heart/sapwood, hard/soft wood; section observations',
      '4.2 Light capture & gas exchange — leaf adaptations, shoot architecture, branching, leaf size & phyllotaxy; dicot/monocot leaf anatomy, stomatal structure, opening/closing mechanisms & factors, spongy mesophyll & spaces; stomata & lenticel observation',
      '4.3 Water & mineral transport — water/solute/pressure potential (cell & soil); apoplast/symplast/transmembrane routes; root-hair structure; root-to-xylem-to-shoot pathway; cohesion-tension & bulk flow; mineral uptake; Tradescantia solute-potential & Alocasia/potato water-potential experiments',
      '4.4 Phloem transport — characteristics & materials; loading, mass flow, unloading; pressure-flow hypothesis',
      '4.5 Water loss — transpiration routes & factors; root pressure & guttation; potometer rate experiments',
      '4.6 Nutrition — autotrophic/photoautotrophic, symbiosis (mutualism, parasitism, commensalism), carnivorous plants; essential macro/micronutrients, forms, functions & deficiency symptoms',
      '4.7 Reproduction — alternation of generations (gametophyte/sporophyte reduction trends); Pogonatum, Nephrolepis, Selaginella, Cycas, angiosperms; flower structure, pollination & fertilization, cross-pollination significance, endosperm/embryo/fruit/seed development, parthenocarpy/parthenogenesis, dormancy, germination changes',
      '4.8 Responses & hormones — photomorphogenesis, action spectra, blue-light & phytochrome receptors (germination, spacing, flowering, elongation, phototropism); gravitropism & statolith hypothesis; thigmotropism/thigmonasty; auxins, gibberellins, cytokinins, abscisic acid, ethylene, jasmonic acid & agricultural uses; abiotic (drought, flooding, cold, salinity) & biotic (pests, pathogens, herbivores) stress; secondary metabolites (cyanogenic glucosides, terpenoids, alkaloids, phenolics)',
    ],
    status: 'not_started',
  },
  // UNIT 05 — ANIMAL FORM AND FUNCTION (195 periods • Grade 13)
  {
    id: 'bio-05',
    subject: 'Biology',
    unitNumber: 5,
    unitTitle: 'Animal Form and Function',
    topicTitle: 'Animal Form and Function',
    subtopics: [
      '5.1 Animal tissues — epithelial (simple squamous/cuboidal/columnar/pseudostratified, stratified), connective (areolar, fibrous, adipose, blood, cartilage, bone), muscle (smooth/skeletal/cardiac), nervous (neurons, neuroglia); microscopic identification',
      '5.2 Nutrition & digestion — heterotrophic/holozoic/symbiosis (mutualism, parasitism, commensalism); ingestion/digestion/absorption/assimilation/egestion; filter/substrate/fluid/bulk feeders; human alimentary canal & glands (salivary, liver, pancreas histology), regulation; balanced diet, food components, vitamins/minerals (sources & deficiency), essential amino/fatty acids, BMR & energy budget, obesity, malnutrition, allergies, gastritis, constipation; diagrams & models',
      '5.3 Circulation — open vs closed, single vs double circulation; human blood & lymphatic systems, heart structure, cardiac cycle & stroke volume, ECG, systolic/diastolic pressure, hypertension/hypotension, coronary circulation & blockage; respiratory pigments, gas & substance transport, blood composition & functions, clotting, ABO & Rh grouping; specimens & diagrams',
      '5.4 Respiration & immunity — respiratory surfaces (body covering, external/internal gills, trachea, book lungs, lungs); human airway gross structure, lung ventilation, external vs internal gas exchange, breathing control; smoking/dust/silica/asbestos effects, lung cancer, TB, asthma; respiratory volumes & capacities; exercise effects on rate & pulse; innate (barriers, phagocytes, antimicrobial proteins, inflammation, NK cells) vs adaptive (humoral, cell-mediated, antigens, antibodies, T/B lymphocytes, active/passive immunity); allergies, autoimmunity, immunodeficiency',
      '5.5 Excretion & osmoregulation — need & products, substrate-product relations, nitrogenous wastes vs environment; excretory structures (body surface, contractile vacuoles, flame cells, nephridia, Malpighian tubules, green/antennal glands, sweat/salt glands); human urinary system (kidney location/blood supply/structure, ureters, bladder, urethra), nephron & urine formation (ultrafiltration, reabsorption, secretion), ADH/aldosterone, kidney homeostatic roles (osmoregulation, blood volume/pH, erythropoietin, renin, pressure); stones, CKDu',
      '5.6 Nervous coordination — need & nervous vs endocrine comparison; phyla organizations (Cnidaria, Platyhelminthes, Annelida, Arthropoda, Echinodermata, Chordata); human CNS (brain, meninges, ventricles, CSF; cerebrum lobes & sensory/association/motor areas; medulla, pons, midbrain, cerebellum, thalamus, hypothalamus; spinal cord), PNS (cranial/spinal nerves), autonomic (sympathetic/parasympathetic); resting/action potentials, ion exchange, synapses, neurotransmitters (acetylcholine, amino acids, biogenic amines, neuropeptides, gases), reflex arc; schizophrenia, depression, Alzheimer’s; diagrams & models',
      '5.7 Receptors, skin & endocrine — chemoreceptors (taste, olfactory), thermoreceptors (Krause, Ruffini, free endings), photoreceptors (rods/cones), mechanoreceptors (Meissner, Pacinian, vibration, pain, special endings); eye & ear structure-function; skin layers (epidermis/dermis), hairs, glands, receptors & functions; endocrine glands (hypothalamus, pituitary, thyroid, parathyroid, thymus, adrenals, islets of Langerhans, pineal, gonads), negative/positive feedback; diabetes type 1/2, hyper/hypothyroidism',
      '5.8 Homeostasis — internal vs external environment, feedback; temperature, glucose, osmoregulation, liver roles',
      '5.9 Reproduction — asexual (fission binary/multiple, budding, fragmentation, sporulation) vs sexual (gamete formation, bisexual/unisexual, external/internal fertilization, parthenogenesis); male system (scrotum, testis histology, seminiferous tubules, Leydig/Sertoli cells, epididymis, vas deferens, urethra/penis, sperm structure, spermatogenesis steps, seminal vesicles/prostate/semen, GnRH/FSH/LH/inhibin/testosterone regulation); female system (ovaries, germinal epithelium, follicles, Graafian, corpus luteum/albicans, oogenesis, ovulation regulation, ovum structure, oviducts, uterus, vagina, menstrual cycle & FSH/GnRH/LH/progesterone/oestrogen, menopause); fertilization, cleavage, implantation, fetal membranes/placenta/umbilical cord, pregnancy trimesters, parturition & positive feedback, lactation regulation, breast-milk composition & breastfeeding significance; diagrams & models',
      '5.10 Reproductive health — pregnancy signs & tests, birth control (female/male), abortions, STIs (gonorrhea, syphilis, genital herpes, HIV/AIDS), infertility, modern tech (hormone therapy, surgery, IVF, ICSI)',
      '5.11 Skeleton & movement — hydrostatic (gastrovascular cavity, pseudocoelom, interstitial fluid, coelom), exoskeleton (chitinous, CaCO3, bony plates), endoskeleton (CaCO3 plates, bone, cartilage); support/movement/protection, Ca/phosphate storage, blood-cell production; axial (skull, cranium, vertebral column curvatures/vertebrae/discs, ribs, sternum) & appendicular (upper-limb mobility vs lower-limb strength/posture/weight/walking, foot arches) with specimens; osteoarthritis, osteoporosis, slipped disc; joints (ball-and-socket, hinge, pivot); muscle features, sarcomere & sliding-filament theory',
    ],
    status: 'not_started',
  },
  // UNIT 06 — GENETICS (25 periods • Grade 13)
  {
    id: 'bio-06',
    subject: 'Biology',
    unitNumber: 6,
    unitTitle: 'Genetics',
    topicTitle: 'Genetics',
    subtopics: [
      '6.1 Mendelian heredity — monohybrid & dihybrid crosses, test crosses, multi-factor crosses',
      '6.2 Human Mendelian traits & pedigree charts',
      '6.3 Non-Mendelian inheritance — incomplete & codominance, polyallelism, gene interaction, epistasis (dominant/recessive), pleiotropy, polygenic inheritance, linkage, sex determination & sex-linked traits, epigenetics concept',
      '6.4 Population genetics — gene-frequency evolution, Hardy-Weinberg equilibrium',
      '6.5 Plant & animal breeding — artificial selection, inbreeding vs outbreeding, hybrids, interspecific breeding, polyploidy, mutagenesis, genetic modification & principles',
    ],
    status: 'not_started',
  },
  // UNIT 07 — MOLECULAR BIOLOGY AND RECOMBINANT DNA TECHNOLOGY (40 periods • Grade 13)
  {
    id: 'bio-07',
    subject: 'Biology',
    unitNumber: 7,
    unitTitle: 'Molecular Biology and Recombinant DNA Technology',
    topicTitle: 'Molecular Biology and Recombinant DNA Technology',
    subtopics: [
      '7.1 DNA/RNA & replication — DNA/RNA structure, prokaryotic vs eukaryotic chromosome architecture; unwinding, polymerization, RNA primers, leading/lagging strands, gap sealing; helicase, primase, polymerases, ligase, topoisomerase, SSB proteins; prokaryotic replication overview; nucleotide-excision repair overview',
      '7.2 Genes & protein synthesis — prokaryotic vs eukaryotic gene nature, chromosomal theory, genetic code & codons, exons/introns/non-coding areas; gene-expression overview, DNA/RNA/enzyme roles, one-gene/one-polypeptide hypothesis, translation mechanism, polyribosomes, protein trafficking & degradation',
      '7.3 Mutations — mutagens; gene vs chromosomal mutations; human disorders (Down, Turner, Klinefelter, colour blindness, sickle-cell anaemia); genetic counselling; mutations in evolution',
      '7.4 Gene technology tools — in vitro DNA manipulation, isolation principles, nucleases/ligases/polymerases, agarose gel electrophoresis, probes & hybridization; recombinant DNA & cloning, vectors (plasmids/phage/yeast artificial), libraries, reverse transcriptase, marker genes, delivery (transformation/transduction/Agrobacterium/gene guns)',
      '7.5 DNA analysis & applications — restriction maps, sequencing, fingerprints, PCR (methods not expected for mapping/sequencing); GMOs in agriculture/medicine/industry; health/environmental/socio-economic concerns; Cartagena protocol & national biosafety framework',
    ],
    status: 'not_started',
  },
  // UNIT 08 — ENVIRONMENTAL BIOLOGY (40 periods • Grade 13)
  {
    id: 'bio-08',
    subject: 'Biology',
    unitNumber: 8,
    unitTitle: 'Environmental Biology',
    topicTitle: 'Environmental Biology',
    subtopics: [
      '8.1 Ecosystems — importance & organizational levels, abiotic vs biotic components; structure & function, niche vs habitat, biotic interactions, food chains/webs, material & energy flow, energy pyramids',
      '8.2 Biomes & Sri Lankan ecosystems — world terrestrial biomes (tropical forest, savanna, desert, chaparral, temperate grassland/broadleaf forest, coniferous forest, tundra: distribution & characteristics); Sri Lanka terrestrial (lowland rain, dry monsoon, montane, thorn forests; savanna, patana grasslands), inland wetlands (rivers, reservoirs, marshes, villus), coastal (lagoons/estuaries, mangroves, coral reefs, seashore, dunes, seagrass, salt marshes)',
      '8.3 Biodiversity & threats — commercial/non-commercial/environmental/recreational/ethical values; loss mechanisms (habitat loss/fragmentation, overexploitation, pollution, invasives, climate change); threatened categories (vulnerable, endangered, critically endangered, extinct in wild with plant/animal examples); hotspots; endemic/indigenous/exotic/migratory/relict/flagship/keystone/invasive species (Sri Lankan examples)',
      '8.4 Global problems — causes & impacts of warming/climate change, ozone depletion, desertification, acid rain',
      '8.5 Conservation — in situ vs ex situ with examples; international agreements (CITES, CBD, Ramsar, MARPOL, Montreal, Kyoto, Basel) outcomes; national legislation (Fauna & Flora Protection Ordinance, National Environment Act)',
    ],
    status: 'not_started',
  },
  // UNIT 09 — MICROBIOLOGY (50 periods • Grade 13)
  {
    id: 'bio-09',
    subject: 'Biology',
    unitNumber: 9,
    unitTitle: 'Microbiology',
    topicTitle: 'Microbiology',
    subtopics: [
      '9.1 Microbial diversity & lab techniques — size units, ubiquity, growth rate, morphological/nutritional/physiological diversity; bacteria/archaea/cyanobacteria, unicellular protista, fungi, mollicutes (mycoplasmas/phytoplasmas), viruses/viroids/prions as pathogens; sterilization (moist/dry heat, membrane filters, UV, disinfectants), NA/PDA media & toddy/yoghurt/root-nodule inoculation, simple staining, sterilization of water/media/glassware/heat-labile items/needles, alcohol & disinfectant use',
      '9.2 Infectious diseases — normal human microbiota; pathogen/pathogenicity/host/parasite relations, virulence factors, invasiveness enzymes (phospholipase, lecithinase, hyaluronidase), toxigenicity (endotoxins Salmonella typhi; cytotoxins Corynebacterium diphtheriae; enterotoxins Vibrio cholerae; neurotoxins Clostridium tetani); portals of entry (respiratory, genito-urinary, gastrointestinal, skin wounds); organ diseases & agents only (skin: chickenpox/rubella/measles; eye: conjunctivitis; nervous: meningitis/tetanus/rabies; cardiovascular: rheumatic fever; respiratory: TB/pneumonia/influenza; digestive: hepatitis/food poisoning/cholera/typhoid; urinary: leptospirosis; reproductive: gonorrhea/genital herpes; immune: AIDS)',
      '9.3 Disease control — disinfectants, antiseptics, immunization & vaccines; curative chemotherapeutics & antibiotics',
      '9.4 Applied microbiology — metabolic principles for product formation, microbial vs chemical advantages; industrial uses (single-cell protein, alcohol/beverages, vinegar, dairy, organic acids, metal extraction, vitamins, vaccines, enzymes, antibiotics, insulin, growth hormone, retting, biogas, biofuel, bakery); environmental (bioremediation, waste treatment); agricultural (biofertilizers incl. mycorrhiza/phosphate/nitrogen fixation/growth substances, biopesticides/biocontrol, composting)',
      '9.5 Soil & water microbiology — soil microbe nature/distribution/roles, depth distribution, mineral cycles (mineralization, carbon & nitrogen cycles), plant-growth & rhizosphere/mycorrhizal interactions; domestic/wastewater microbiology, drinking-water contamination & water-borne diseases, indicator microbes, treatment steps, industrial wastewater effects & treatment principles; solid-waste nature, recycling importance, problems & minimization',
      '9.6 Food microbiology — spoilage (nutrients/water, physical/chemical/biological changes; external T/oxygen/humidity & internal pH/moisture/nutrients/structure factors); food-borne infections vs intoxications (typhoid Salmonella typhi, dysentery Shigella, cholera Vibrio cholerae, Staphylococcus aureus & Clostridium botulinum intoxications, aflatoxin Aspergillus flavus)',
    ],
    status: 'not_started',
  },
  // UNIT 10 — APPLIED BIOLOGY (25 periods • Grade 13)
  {
    id: 'bio-10',
    subject: 'Biology',
    unitNumber: 10,
    unitTitle: 'Applied Biology',
    topicTitle: 'Applied Biology',
    subtopics: [
      '10.1 Aquaculture & ornamental fish — need, culturable-species traits, species used, aquarium maintenance, common diseases, environmental impact',
      '10.2 Horticulture — nursery management; protected agriculture (greenhouse/polytunnels: bell pepper, carnation, strawberry); tissue-culture principle & importance; floriculture (grafting/propagation, Anthurium/Orchid cut flowers, Rose/Begonia ornamentals)',
      '10.3 Vector-borne diseases — dengue & filaria transmission, vector & agent traits, breeding sites, symptoms, control measures',
      '10.4 Food preservation & post-harvest — importance & principles; loss causes & minimization (harvesting, transport, storage, domestic processing)',
      '10.5 Emerging biotechnologies — nanobiology, stem-cell therapy, human & other genome projects',
    ],
    status: 'not_started',
  },

  // ================= ICT =================
  // UNIT 01 — CONCEPT OF ICT (28 periods • Grade 12 & 13)
  {
    id: 'ict-01',
    subject: 'ICT',
    unitNumber: 1,
    unitTitle: 'Concept of ICT',
    topicTitle: 'Concept of ICT',
    subtopics: [
      '1.1 Building blocks of information — data life cycle (creation, management, removal of obsolete data); data vs information; definition of information; valuable-information traits (timeliness, accuracy, context, understandability, less uncertainty); large-volume & complexity need',
      '1.2 Information in daily life — decision/policy making, predictions, planning/scheduling/monitoring; manual-method drawbacks (inconsistency, duplication, errors, delays, poor sharing & service); harmful manual cases; ICT era emergence; domain uses; retrieval/sharing tech; networks, Internet & WWW; mobile/cloud computing',
      '1.3 Abstract model — input-process-output information creation & compliance with computer/ICT',
      '1.4 Computer-system components — hardware classification, software classification, human operators & need in information systems',
      '1.5 Data processing — steps (gathering, validation, processing, output, storage); gathering methods (manual, semi-automated, automated); tools (OMR, OCR, MICR, card/tape readers, magnetic-strip/barcode readers, sensors, loggers); validation (type/presence/range checks); input modes (direct/remote, online/offline, batch/real-time); output methods (direct presentation, store for further processing); storage (local/remote-cloud, short/long-term)',
      '1.6 ICT in domains — education, healthcare, agriculture, business & finance, engineering, tourism, media & journalism, law enforcement',
      '1.7 Societal impact — social/economic benefits; social/economical/environmental/ethical/legal/privacy/digital-divide issues; confidentiality, stealing/phishing, piracy, copyright/IP laws, plagiarism, licensed vs unlicensed software',
    ],
    status: 'not_started',
  },
  // UNIT 02 — INTRODUCTION TO COMPUTER (22 periods • Grade 12 & 13)
  {
    id: 'ict-02',
    subject: 'ICT',
    unitNumber: 2,
    unitTitle: 'Introduction to Computer',
    topicTitle: 'Introduction to Computer',
    subtopics: [
      '2.1 History & generations — early aids (mechanical, electromechanical), electronic age; 1G/2G/3G/4G & future (processor evolution); classifications: technology (analog/digital), purpose (special/general), size (super, mainframe, mini, micro incl. smartphones/tablets/phablets)',
      '2.2 Hardware & interfaces — input devices (keyboard entry vs direct entry: pointing devices, touchpad, remote, touchscreen, magnetic-strip/barcode/smart-card readers, scanner, digital/video/web camera, microphone, sensors, graphic tablets, MICR/OMR/OCR, digitizer) & direct-entry advantages; output devices (CRT/TFT/LED monitors, dot-matrix/inkjet/laser/3D printers, plotter, speakers); CPU-motherboard compatibility; storage (internal/external HDD, magnetic tape, optical CD/DVD/Blu-ray variants, flash, mini disk); parallel & grid computing',
      '2.3 Von Neumann architecture — stored-program concept; components (input, output, memory, CU, ALU); fetch-execute cycle; CPU: ALU, CU, registers, data/control bus, multi-core processors',
      '2.4 Memory system — hierarchy need; comparison (size/density, access method, access time, capacity, cost); volatile (registers, cache types, RAM: SRAM/DRAM/SDRAM); non-volatile (PROM/EPROM/EEPROM ROMs; secondary magnetic/optical/flash)',
    ],
    status: 'not_started',
  },
  // UNIT 03 — DATA REPRESENTATION (18 periods • Grade 12 & 13)
  {
    id: 'ict-03',
    subject: 'ICT',
    unitNumber: 3,
    unitTitle: 'Data Representation',
    topicTitle: 'Data Representation',
    subtopics: [
      '3.1 Numbers in computers — instruction & data representation need; two-state (0,1) representation; binary/octal/hexadecimal & conversions; signed vs unsigned decimals: signed-magnitude, 1’s & 2’s complement',
      '3.2 Characters in computers — BCD, EBCDIC, ASCII, Unicode',
      '3.3 Binary arithmetic & logic — integer addition/subtraction; logical & bitwise logical operations',
    ],
    status: 'not_started',
  },
  // UNIT 04 — FUNDAMENTAL OF DIGITAL CIRCUITS (26 periods • Grade 12 & 13)
  {
    id: 'ict-04',
    subject: 'ICT',
    unitNumber: 4,
    unitTitle: 'Fundamental of Digital Circuits',
    topicTitle: 'Fundamental of Digital Circuits',
    subtopics: [
      '4.1 Logic gates & truth tables — basic (NOT, AND, OR, XOR); combinational (NAND, NOR, XNOR); universal (NAND, NOR)',
      '4.2 Logic simplification — two-state logic & Boolean algebra; postulates/axioms; laws (commutative, associative, distributive, identity, redundancy, De Morgan); SOP vs POS & conversion; simplification via theorems & Karnaugh maps',
      '4.3 Gate circuits — truth tables & expressions for designs up to three inputs; digital-circuit design',
      '4.4 CPU combinational blocks — half adder, full adder; bit storage: feedback loop & flip-flops',
    ],
    status: 'not_started',
  },
  // UNIT 05 — COMPUTER OPERATING SYSTEM (22 periods • Grade 12 & 13)
  {
    id: 'ict-05',
    subject: 'ICT',
    unitNumber: 5,
    unitTitle: 'Computer Operating System',
    topicTitle: 'Computer Operating System',
    subtopics: [
      '5.1 OS concepts — definition & need, evolution; functions (interfaces, process, resource, security/protection); classification (single-user single-task, single-user multi-task, multi-user multi-task, multi-threading, real-time, time-sharing)',
      '5.2 Files & directories — file types (.exe/.jpg/.txt need); hierarchy & file systems (FAT etc.); security (passwords, privileges); allocation (contiguous/linked/indexed); defragmentation; formatting need & outcome',
      '5.3 Process management — process definition, interrupts & handling, states, transitions, PCB, context switching, schedulers',
      '5.4 Resource management — MMU, physical & virtual memory; device management (drivers, spooling)',
    ],
    status: 'not_started',
  },
  // UNIT 06 — DATA COMMUNICATION AND NETWORKING (50 periods • Grade 12 & 13)
  {
    id: 'ict-06',
    subject: 'ICT',
    unitNumber: 6,
    unitTitle: 'Data Communication and Networking',
    topicTitle: 'Data Communication and Networking',
    subtopics: [
      '6.1 Signals — digital vs analog; amplitude/frequency/wavelength/phase; propagation speed in media',
      '6.2 Transmission media — guided (twisted pair, coaxial, fiber) vs unguided (free space); latency, bandwidth, noise, attenuation, distortion; point-to-point topology',
      '6.3 Data encoding — protocol agreement on signal elements (two voltage levels; frequency/phase options); element speed; synchronization (timing/clocks, Manchester encoding); error handling (parity example)',
      '6.4 PSTN & modems — circuit for analog voice; modulation/demodulation; connecting devices via modems',
      '6.5 Multi-device networks — all-to-all impracticality; bus topology & access-control problem; star/ring/mesh; hubs & switches for wiring',
      '6.6 MAC & LAN — device identification via MAC addresses; frames; orderly access (ALOHA example to Ethernet improvements); broadcast vs unicast',
      '6.7 Internetworking — gateways; global uniform addressing vs MAC/LAN: IPv4, subnetting & masks, CIDR, private IPs, DHCP; IPv4 scarcity & IPv6 overview; routing/routers, packet switching, best-effort delivery',
      '6.8 Transport protocols — app-to-app delivery, multiplexing, ports; UDP vs TCP properties & applications',
      '6.9 Internet applications — DNS (hard-to-remember IPs, human-friendly hierarchical names, domain responsibility, TLDs); HTTP; client-server model',
      '6.10 Reference models — TCP/IP (application, transport, internet, host-to-network) vs OSI (presentation, session, network, data-link, physical)',
      '6.11 Security — encryption & digital signatures (public/private keys, signing); threats (viruses, trojans, malware, phishing); protection (firewalls, antivirus, awareness/good practices)',
      '6.12 ISPs & home networks — ISP role; modems, DSL/ADSL; home LAN with private IPs, NAT/proxies',
    ],
    status: 'not_started',
  },
  // UNIT 07 — SYSTEM ANALYSIS AND DESIGN (68 periods • Grade 12 & 13)
  {
    id: 'ict-07',
    subject: 'ICT',
    unitNumber: 7,
    unitTitle: 'System Analysis and Design',
    topicTitle: 'System Analysis and Design',
    subtopics: [
      '7.1 Systems — concept; classifications: open/closed, natural/manmade, living/physical',
      '7.2 Manmade information systems — OAS, TPS, MIS, DSS, ESS, GIS, KMS, CMS, ERPS, smart systems: objectives & functionality',
      '7.3 Development models & methods — waterfall, spiral, agile, prototyping/RAD; structured vs object-oriented methodologies',
      '7.4 SSADM — introduction & SDLC stages',
      '7.5 System need & feasibility — preliminary investigation (current-system problems, alternatives, prioritization); technical/economic/operational/organizational feasibility',
      '7.6 Current-system analysis — functional vs non-functional requirements; BAM/business-activity model, DFM/DFD/EPD/document-flow, LDM/LDS; business system options (BSO)',
      '7.7 Proposed system — logical DFDs/EPDs & UI design; logical data modelling & LDS; physical DB design (tables/records, data dictionary, DB design)',
      '7.8 Build & test — program & database development; test cases; white/black-box, unit, integrated, system & acceptance testing',
      '7.9 Deployment — parallel/direct/pilot/phase methods; installation, data migration, user training; review, support & maintenance',
      '7.10 Packaged systems — off-the-shelf pros/cons; package capabilities & workflows; gap analysis, mapping, reengineering',
    ],
    status: 'not_started',
  },
  // UNIT 08 — DATABASE MANAGEMENT (50 periods • Grade 12 & 13)
  {
    id: 'ict-08',
    subject: 'ICT',
    unitNumber: 8,
    unitTitle: 'Database Management',
    topicTitle: 'Database Management',
    subtopics: [
      '8.1 Basics — data vs information; structured vs unstructured; database definition; models (flat-file, hierarchical, network, relational, object-relational) & comparison',
      '8.2 Relational components — relations/tables, attributes/columns, tuples/rows, relationships; constraints: NOT NULL, UNIQUE, PRIMARY KEY, FOREIGN KEY, CHECK',
      '8.3 DBMS & SQL — DBMS role; DDL (SQL intro & classification; CREATE/ALTER incl. add-drop attributes/keys, DROP tables/databases); DML (INSERT/modify/retrieve/update/delete; SELECT single & multi-table inner-join, INSERT, UPDATE, DELETE queries)',
      '8.4 Conceptual schema — ER diagrams (entities, attributes, identifiers, relationships, cardinality); EER intro',
      '8.5 Logical schema — definition; relational schema, instances, candidate/primary/alternate/foreign keys, domain',
      '8.6 ER transformation — entity, attribute & relationship transformation',
      '8.7 Normalization — redundancies & insert/update/delete anomalies; functional dependencies (full/partial/transitive); 0NF/1NF/2NF/3NF',
    ],
    status: 'not_started',
  },
  // UNIT 09 — PROGRAMMING (74 periods • Grade 12 & 13)
  {
    id: 'ict-09',
    subject: 'ICT',
    unitNumber: 9,
    unitTitle: 'Programming',
    topicTitle: 'Programming',
    subtopics: [
      '9.1-9.3 Problem solving & algorithms — understanding/defining/planning/implementing; modularization, top-down & stepwise refinement, structure charts; algorithms via flowcharts, pseudocode & hand traces',
      '9.4-9.6 Paradigms & translation — language evolution; imperative/declarative/OO paradigms; source vs object programs; interpreters/compilers/hybrid, linkers; IDE features (open/save, compile/execute, debugging)',
      '9.7-9.8 Imperative coding & control — program structure, comments, constants/variables, primitive types, operator categories (arithmetic/relational/logical/bitwise) & precedence, keyboard input & standard output; sequence/selection/repetition (iteration/looping)',
      '9.9-9.10 Subprograms & data structures — built-in vs user-defined (structure, parameters, return/default values, scope); strings, lists, tuples, dictionaries',
      '9.11-9.13 Files, databases & algorithms — file operations; DB connect/retrieve/add/modify/delete; sequential search & bubble sort',
    ],
    status: 'not_started',
  },
  // UNIT 10 — WEB DEVELOPMENT (60 periods • Grade 12 & 13)
  {
    id: 'ict-10',
    subject: 'ICT',
    unitNumber: 10,
    unitTitle: 'Web Development',
    topicTitle: 'Web Development',
    subtopics: [
      '10.1-10.2 Web need & requirements — WWW, site types (information/news, personal/educational/commercial/research, portals); objectives & multimedia content planning',
      '10.3-10.4 HTML pages & links — <html>/<head>/<title>/<body>, background, headings h1-h6, p/br, underline/bold/italic, font size-colour, comments; home vs linked pages; hyperlinks (bookmark/local/external); ordered/unordered/definition lists; images; tables (table/th/tr/td/caption, merging); audio/video',
      '10.5 CSS — intro, syntax & comments; element/id/class/group selectors; inline/internal/external insertion; backgrounds, text/fonts, links, lists, tables formatting',
      '10.6 Authoring tools — intro to web authoring tools',
      '10.7 Dynamic pages with PHP — dynamic intro; embedding PHP: variables, arrays, control structures, functions, DB connectivity & working with databases; forms (input type/name/value, text/password, radio, checkbox, selection, submit/reset, action, GET/POST, fieldset grouping, saving to DB); data-source creation; PHP-MySQL retrieval & form-value setting',
      '10.8 Publishing & maintenance — local (own computer/intranet) vs internet (provider connection, server publishing); performance factors',
    ],
    status: 'not_started',
  },
  // UNIT 11 — INTERNET OF THINGS (15 periods • Grade 12 & 13)
  {
    id: 'ict-11',
    subject: 'ICT',
    unitNumber: 11,
    unitTitle: 'Internet of Things',
    topicTitle: 'Internet of Things',
    subtopics: [
      '11.1 Microprocessor development systems — Arduino/Raspberry Pi etc. vs traditional computers; features (analog/digital input, microprocessor, digital output, RX/TX pins, USB, power, reset); computer connection, USB connectivity, IDE (editor/compiler/programmer); simple apps (LED on/off, LDR light-intensity LEDs, temperature-sensor fan, magnet-switch door detection)',
      '11.2 IoT applications — definition, needs, applications, enabling technologies; simple remote-switch IoT app',
    ],
    status: 'not_started',
  },
  // UNIT 12 — ICT IN BUSINESS (12 periods • Grade 12 & 13)
  {
    id: 'ict-12',
    subject: 'ICT',
    unitNumber: 12,
    unitTitle: 'ICT in Business',
    topicTitle: 'ICT in Business',
    subtopics: [
      '12.1 ICT in business — digital economy & new methods (reverse auctions, group purchasing, e-marketplace); pure-brick/brick-and-click/pure-click orgs; ICT in accounting/HR/production/marketing-sales/supply-chain/communication; secure payments (gateways, secure credit cards, PayPal/third-party, encryption, micro/bitcoin payments); ecommerce threats & opportunities (privacy, commercialization)',
      '12.2 E-commerce & e-business — scope; transaction types (B2B/B2C/C2C/C2B/B2E/G2C); models (virtual storefronts, information brokers, marketplaces, content providers, online service providers, portals, virtual communities); advantages vs disadvantages',
      '12.3 E-marketing — marketing concepts, ICT in marketing (web advertising etc.); marketing databases, AI prediction of customer behaviour, competitive advantage; mobile marketing',
    ],
    status: 'not_started',
  },
  // UNIT 13 — NEW TRENDS AND FUTURE DIRECTIONS OF ICT (12 periods • Grade 12 & 13)
  {
    id: 'ict-13',
    subject: 'ICT',
    unitNumber: 13,
    unitTitle: 'New Trends and Future Directions of ICT',
    topicTitle: 'New Trends and Future Directions of ICT',
    subtopics: [
      '13.1 Emerging trends — intelligent & emotional computing, artificial intelligence, man-machine & machine-to-machine coexistence (incl. cloud & IoT)',
      '13.2 Agent technology — software agents, multi-agent systems & applications',
      '13.3 Future computing — beyond von Neumann, nature/biology-inspired computing, quantum-computing fundamentals & applications',
    ],
    status: 'not_started',
  },
  // UNIT 14 — PROJECT (30 periods • Grade 12 & 13)
  {
    id: 'ict-14',
    subject: 'ICT',
    unitNumber: 14,
    unitTitle: 'Project',
    topicTitle: 'Project',
    subtopics: [
      '14.1 Project planning, design and implementation',
      '14.2 Project report and presentation',
    ],
    status: 'not_started',
  },
];

export function getInitialTimetableForStream(
  stream: StreamType | string,
  physicalScienceElective: 'Chemistry' | 'ICT' | string = 'Chemistry'
): TimetableEntry[] {
  const isBio = stream === 'Biological Science' || (stream as string) === 'Bio';
  const isIct = !isBio && physicalScienceElective === 'ICT';

  return INITIAL_TIMETABLE_ENTRIES.map((entry) => {
    if (isBio && entry.subject === 'Combined Mathematics') {
      const bioTopicMap: Record<string, string> = {
        'tt-mon-1': 'Plant Form: Photosynthesis & Calvin Cycle',
        'tt-tue-2': 'Genetics: Mendelian Dihybrid Crosses & Testcrosses',
        'tt-wed-2': 'Animal Physiology: Human Nephron & Countercurrent System',
        'tt-thu-3': 'Cell Biology: Mitosis, Meiosis & Cell Cycle Regulation',
        'tt-fri-1': 'Molecular Biology: DNA Replication & Translation',
        'tt-sat-1': 'Full 50 MCQ Past Paper Timed Simulation (Paper I)',
        'tt-sun-1': 'Diversity of Organisms: Kingdom Classification Drill',
      };
      return {
        ...entry,
        id: `bio-${entry.id}`,
        subject: 'Biology',
        topic: bioTopicMap[entry.id] || 'Biology Core Unit Study Block',
        color: 'emerald',
      };
    }

    if (isIct && entry.subject === 'Chemistry') {
      const ictTopicMap: Record<string, string> = {
        'tt-mon-3': 'Number Systems & Karnaugh Maps (K-Maps)',
        'tt-tue-3': 'Computer Architecture & Memory Hierarchy',
        'tt-wed-1': 'Data Communication: TCP/IP & IPv4 Subnetting',
        'tt-thu-2': 'Database Systems: ER Diagrams & 3NF Normalization',
        'tt-fri-3': 'Python Programming: Algorithms, Recursion & File I/O',
        'tt-sat-3': 'Full 50 MCQ Past Paper Timed Simulation & Tracing',
        'tt-sun-3': 'Web Technologies & Network Security Analysis',
      };
      return {
        ...entry,
        id: `ict-${entry.id}`,
        subject: 'ICT',
        topic: ictTopicMap[entry.id] || 'ICT Python & Database Practice',
        color: 'pink',
      };
    }

    return entry;
  });
}

export const INITIAL_TIMETABLE_ENTRIES: TimetableEntry[] = [
  // Monday
  {
    id: 'tt-mon-1',
    dayOfWeek: 'Monday',
    subject: 'Combined Mathematics',
    topic: 'Mechanics: Coplanar Forces & Rod Equilibrium',
    startTime: '06:00',
    endTime: '08:00',
    color: 'indigo',
    reminderEnabled: true,
    reminderOffsetMinutes: 15,
    notes: 'Solve 2018-2022 Structured Essay questions on friction and tipping',
  },
  {
    id: 'tt-mon-2',
    dayOfWeek: 'Monday',
    subject: 'Physics',
    topic: 'Oscillations & Waves: Resonance & Doppler Shift',
    startTime: '16:00',
    endTime: '18:00',
    color: 'cyan',
    reminderEnabled: true,
    reminderOffsetMinutes: 15,
    notes: 'Formula recall + 15 past MCQ questions on sound speed',
  },
  {
    id: 'tt-mon-3',
    dayOfWeek: 'Monday',
    subject: 'Chemistry',
    topic: 'Inorganic Chemistry: Group 2 and Group 17 Halogens',
    startTime: '20:00',
    endTime: '22:00',
    color: 'purple',
    reminderEnabled: false,
    reminderOffsetMinutes: 0,
    notes: 'Review precipitation colors & thermal decomposition temperatures',
  },

  // Tuesday
  {
    id: 'tt-tue-1',
    dayOfWeek: 'Tuesday',
    subject: 'Physics',
    topic: 'Mechanics: Rotational Dynamics & Moment of Inertia',
    startTime: '06:00',
    endTime: '08:00',
    color: 'cyan',
    reminderEnabled: true,
    reminderOffsetMinutes: 15,
    notes: 'Rolling without slipping derivations & kinetic energy conservation',
  },
  {
    id: 'tt-tue-2',
    dayOfWeek: 'Tuesday',
    subject: 'Combined Mathematics',
    topic: 'Integration: Integration by Parts & Partial Fractions',
    startTime: '15:30',
    endTime: '17:30',
    color: 'indigo',
    reminderEnabled: true,
    reminderOffsetMinutes: 10,
    notes: 'Work through 10 standard A/L integral reductions',
  },
  {
    id: 'tt-tue-3',
    dayOfWeek: 'Tuesday',
    subject: 'Chemistry',
    topic: 'Organic Chemistry: Alkene & Benzene Mechanisms',
    startTime: '20:00',
    endTime: '22:00',
    color: 'purple',
    reminderEnabled: false,
    reminderOffsetMinutes: 0,
    notes: 'Draw complete curly arrows for electrophilic aromatic substitutions',
  },

  // Wednesday
  {
    id: 'tt-wed-1',
    dayOfWeek: 'Wednesday',
    subject: 'Chemistry',
    topic: 'Physical Chemistry: Chemical Equilibrium & Kc/Kp',
    startTime: '06:00',
    endTime: '08:00',
    color: 'purple',
    reminderEnabled: true,
    reminderOffsetMinutes: 15,
    notes: 'Haber process pressure shift & temperature equilibrium shifts',
  },
  {
    id: 'tt-wed-2',
    dayOfWeek: 'Wednesday',
    subject: 'Combined Mathematics',
    topic: 'Calculus: Curve Sketching & Optimization Maxima/Minima',
    startTime: '16:00',
    endTime: '18:00',
    color: 'indigo',
    reminderEnabled: false,
    reminderOffsetMinutes: 0,
    notes: 'Asymptotes and inflection points practice',
  },
  {
    id: 'tt-wed-3',
    dayOfWeek: 'Wednesday',
    subject: 'Physics',
    topic: 'Current Electricity: Potentiometer & Kirchhoff Laws',
    startTime: '20:00',
    endTime: '22:00',
    color: 'cyan',
    reminderEnabled: true,
    reminderOffsetMinutes: 15,
    notes: 'Review internal resistance calibration circuit diagrams',
  },

  // Thursday
  {
    id: 'tt-thu-1',
    dayOfWeek: 'Thursday',
    subject: 'Physics',
    topic: 'Thermal Physics: Ideal Gas Laws & Thermodynamics Cycles',
    startTime: '06:00',
    endTime: '08:00',
    color: 'cyan',
    reminderEnabled: true,
    reminderOffsetMinutes: 15,
    notes: 'P-V indicator diagrams & work done calculations',
  },
  {
    id: 'tt-thu-2',
    dayOfWeek: 'Thursday',
    subject: 'Chemistry',
    topic: 'Organic Chemistry: Aldehydes, Ketones & Tests',
    startTime: '16:00',
    endTime: '18:00',
    color: 'purple',
    reminderEnabled: false,
    reminderOffsetMinutes: 0,
    notes: 'Tollens, Fehling and 2,4-DNP reactions',
  },
  {
    id: 'tt-thu-3',
    dayOfWeek: 'Thursday',
    subject: 'Combined Mathematics',
    topic: 'Applied Maths: Projectiles on Incline Planes',
    startTime: '20:00',
    endTime: '22:30',
    color: 'indigo',
    reminderEnabled: true,
    reminderOffsetMinutes: 30,
    notes: 'Range along the inclined plane formulas',
  },

  // Friday
  {
    id: 'tt-fri-1',
    dayOfWeek: 'Friday',
    subject: 'Combined Mathematics',
    topic: 'Trigonometry: General Solutions & Multiple Angles',
    startTime: '06:00',
    endTime: '08:00',
    color: 'indigo',
    reminderEnabled: true,
    reminderOffsetMinutes: 15,
    notes: 'Identity transformations and range restrictions',
  },
  {
    id: 'tt-fri-2',
    dayOfWeek: 'Friday',
    subject: 'Physics',
    topic: 'Electronics & Modern Physics: Op-Amps & Diodes',
    startTime: '16:00',
    endTime: '18:00',
    color: 'cyan',
    reminderEnabled: true,
    reminderOffsetMinutes: 15,
    notes: 'Virtual earth concept & voltage gain calculations',
  },
  {
    id: 'tt-fri-3',
    dayOfWeek: 'Friday',
    subject: 'Chemistry',
    topic: 'Chemical Energetics: Hess Law & Born-Haber Cycles',
    startTime: '20:00',
    endTime: '22:00',
    color: 'purple',
    reminderEnabled: false,
    reminderOffsetMinutes: 0,
    notes: 'Lattice energy vs hydration enthalpy energy level diagrams',
  },

  // Saturday
  {
    id: 'tt-sat-1',
    dayOfWeek: 'Saturday',
    subject: 'Combined Mathematics',
    topic: 'Full 50 MCQ Past Paper Timed Simulation (Paper I)',
    startTime: '08:00',
    endTime: '10:00',
    color: 'indigo',
    reminderEnabled: true,
    reminderOffsetMinutes: 15,
    notes: 'Strict exam timing: 2 hours, no interruptions',
  },
  {
    id: 'tt-sat-2',
    dayOfWeek: 'Saturday',
    subject: 'Physics',
    topic: 'Full 50 MCQ Past Paper Timed Simulation',
    startTime: '13:30',
    endTime: '15:30',
    color: 'cyan',
    reminderEnabled: true,
    reminderOffsetMinutes: 15,
    notes: 'Review all incorrect choices immediately after marking',
  },
  {
    id: 'tt-sat-3',
    dayOfWeek: 'Saturday',
    subject: 'Chemistry',
    topic: 'Structured Essay & Essay Writing Drill (Unit 04 & 08)',
    startTime: '16:30',
    endTime: '19:00',
    color: 'purple',
    reminderEnabled: true,
    reminderOffsetMinutes: 15,
    notes: 'Practice writing structured points for markings scheme accuracy',
  },

  // Sunday
  {
    id: 'tt-sun-1',
    dayOfWeek: 'Sunday',
    subject: 'Combined Mathematics',
    topic: 'Mistake Analysis & Formula Revision Log',
    startTime: '08:30',
    endTime: '11:00',
    color: 'indigo',
    reminderEnabled: false,
    reminderOffsetMinutes: 0,
    notes: 'Re-attempt tricky problems from Saturday MCQ simulation',
  },
  {
    id: 'tt-sun-2',
    dayOfWeek: 'Sunday',
    subject: 'Physics',
    topic: 'Practical Experiments Revision: Spherometer, S.H.C, Potentiometer',
    startTime: '14:00',
    endTime: '16:30',
    color: 'cyan',
    reminderEnabled: true,
    reminderOffsetMinutes: 15,
    notes: 'Draw experimental setups and error calculations',
  },
  {
    id: 'tt-sun-3',
    dayOfWeek: 'Sunday',
    subject: 'Chemistry',
    topic: 'Industrial Chemistry & Environmental Pollution Short Notes',
    startTime: '17:30',
    endTime: '19:30',
    color: 'purple',
    reminderEnabled: false,
    reminderOffsetMinutes: 0,
    notes: 'Summarize chemical equations for Haber, Contact and Solvay processes',
  },
];
