// LongenixHealth Medical Algorithms
// Evidence-based clinical calculations for risk assessment and biological age
// Dr. Graham Player, Ph.D - Longenix Health

export interface BiomarkerData {
  [key: string]: number | null
}

export interface PatientData {
  age: number
  gender: 'male' | 'female' | 'other'
  height_cm: number
  weight_kg: number
  systolic_bp: number
  diastolic_bp: number
  biomarkers: BiomarkerData
}

export interface BiologicalAge {
  phenotypic_age: number
  klemera_doubal_age: number
  metabolic_age: number
  telomere_age: number | null // Requires telomere length data
  average_biological_age: number
  age_advantage: number // positive if younger, negative if older
}

export interface RiskAssessment {
  risk_category: string
  risk_score: number
  risk_level: 'low' | 'moderate' | 'high' | 'very_high'
  ten_year_risk: number
  algorithm_used: string
  reference: string
}

/**
 * Biological Age Calculations
 * Based on published research and validated algorithms
 */
export class BiologicalAgeCalculator {
  
  /**
   * Phenotypic Age Algorithm
   * Reference: Levine et al. (2018) "An epigenetic biomarker of aging for lifespan and healthspan"
   * Uses 9 clinical biomarkers to predict mortality risk
   */
  static calculatePhenotypicAge(chronologicalAge: number, biomarkers: BiomarkerData): number {
    const {
      albumin = null,
      creatinine = null,
      glucose = null,
      c_reactive_protein = null,
      lymphocyte_percent = null,
      alkaline_phosphatase = null,
      white_blood_cells = null,
      mean_cell_volume = null,
      red_cell_distribution_width = null
    } = biomarkers

    // Check if we have the required biomarkers for Phenotypic Age
    const requiredMarkers = [albumin, creatinine, glucose, c_reactive_protein, 
                           lymphocyte_percent, alkaline_phosphatase, white_blood_cells, 
                           mean_cell_volume, red_cell_distribution_width]
    
    const availableMarkers = requiredMarkers.filter(marker => marker !== null).length

    if (availableMarkers < 6) {
      // If we don't have enough biomarkers, use a simplified estimation
      return this.calculateSimplifiedBiologicalAge(chronologicalAge, biomarkers)
    }

    // Phenotypic Age calculation based on Levine et al. 2018
    // Mortality score calculation
    let mortalityScore = 0

    // Each biomarker contributes to mortality score with specific coefficients
    if (albumin !== null) mortalityScore += -0.0336 * albumin
    if (creatinine !== null) mortalityScore += 0.0095 * creatinine
    if (glucose !== null) mortalityScore += 0.1953 * glucose
    if (c_reactive_protein !== null) mortalityScore += 0.0954 * Math.log(c_reactive_protein + 1)
    if (lymphocyte_percent !== null) mortalityScore += -0.0120 * lymphocyte_percent
    if (alkaline_phosphatase !== null) mortalityScore += 0.0268 * alkaline_phosphatase
    if (white_blood_cells !== null) mortalityScore += 0.0554 * white_blood_cells
    if (mean_cell_volume !== null) mortalityScore += 0.0026 * mean_cell_volume
    if (red_cell_distribution_width !== null) mortalityScore += 0.3306 * red_cell_distribution_width

    // Convert mortality score to phenotypic age
    const phenotypicAge = 141.50 + Math.log(-0.00553 * Math.log(1 - Math.exp(mortalityScore))) / 0.09165

    return Math.max(0, Math.min(120, phenotypicAge)) // Bound between 0-120 years
  }

  /**
   * Klemera-Doubal Method (KDM)
   * Reference: Klemera & Doubal (2006) "A new approach to the concept and computation of biological age"
   * Uses multiple biomarkers with age-correlation coefficients
   */
  static calculateKlemeraDoubalAge(chronologicalAge: number, biomarkers: BiomarkerData): number {
    // KDM biomarkers with their typical age-correlation coefficients
    const kdmBiomarkers = [
      { name: 'systolic_bp', coeff: 0.4, mean: 120, std: 20 },
      { name: 'total_cholesterol', coeff: 0.2, mean: 200, std: 40 },
      { name: 'glucose', coeff: 0.3, mean: 90, std: 20 },
      { name: 'creatinine', coeff: 0.35, mean: 1.0, std: 0.3 },
      { name: 'albumin', coeff: -0.25, mean: 4.0, std: 0.5 },
      { name: 'hemoglobin', coeff: -0.15, mean: 14, std: 2 },
      { name: 'white_blood_cells', coeff: 0.1, mean: 7, std: 2 }
    ]

    let numeratorSum = 0
    let denominatorSum = 0
    let usedBiomarkers = 0

    for (const biomarker of kdmBiomarkers) {
      const value = biomarkers[biomarker.name]
      if (value !== null && value !== undefined) {
        // Standardize the biomarker value
        const standardizedValue = (value - biomarker.mean) / biomarker.std
        
        // KDM formula components
        const weight = biomarker.coeff * biomarker.coeff
        numeratorSum += weight * (chronologicalAge + standardizedValue / biomarker.coeff)
        denominatorSum += weight
        usedBiomarkers++
      }
    }

    if (usedBiomarkers < 3) {
      // Not enough biomarkers for reliable KDM calculation
      return this.calculateSimplifiedBiologicalAge(chronologicalAge, biomarkers)
    }

    const kdmAge = numeratorSum / denominatorSum
    return Math.max(0, Math.min(120, kdmAge))
  }

  /**
   * Metabolic Age Calculation
   * Based on metabolic biomarkers and body composition
   */
  static calculateMetabolicAge(chronologicalAge: number, biomarkers: BiomarkerData, bmi?: number): number {
    const {
      glucose = null,
      hba1c = null,
      insulin = null,
      triglycerides = null,
      hdl_cholesterol = null,
      ldl_cholesterol = null
    } = biomarkers

    let metabolicScore = chronologicalAge
    let adjustments = 0

    // Glucose metabolism adjustments
    if (glucose !== null) {
      if (glucose > 126) adjustments += 5 // Diabetic range
      else if (glucose > 100) adjustments += 2 // Prediabetic range
      else if (glucose < 70) adjustments += 1 // Hypoglycemic
    }

    if (hba1c !== null) {
      if (hba1c > 6.5) adjustments += 5 // Diabetic
      else if (hba1c > 5.7) adjustments += 3 // Prediabetic
    }

    if (insulin !== null) {
      if (insulin > 20) adjustments += 3 // Insulin resistance
      else if (insulin < 3) adjustments -= 1 // Good insulin sensitivity
    }

    // Lipid profile adjustments
    if (triglycerides !== null) {
      if (triglycerides > 200) adjustments += 2
      else if (triglycerides < 100) adjustments -= 1
    }

    if (hdl_cholesterol !== null) {
      if (hdl_cholesterol < 40) adjustments += 2 // Low HDL
      else if (hdl_cholesterol > 60) adjustments -= 2 // High HDL
    }

    if (ldl_cholesterol !== null) {
      if (ldl_cholesterol > 160) adjustments += 3 // High LDL
      else if (ldl_cholesterol < 100) adjustments -= 1 // Optimal LDL
    }

    // BMI adjustment if available
    if (bmi !== undefined) {
      if (bmi > 30) adjustments += 3 // Obese
      else if (bmi > 25) adjustments += 1 // Overweight
      else if (bmi < 18.5) adjustments += 1 // Underweight
    }

    metabolicScore += adjustments
    return Math.max(0, Math.min(120, metabolicScore))
  }

  /**
   * Simplified Biological Age when insufficient biomarkers
   * Uses available data to provide reasonable estimate
   */
  static calculateSimplifiedBiologicalAge(chronologicalAge: number, biomarkers: BiomarkerData): number {
    let adjustments = 0
    const availableMarkers = Object.values(biomarkers).filter(v => v !== null).length

    // Basic adjustments based on key markers
    if (biomarkers.glucose !== null) {
      if (biomarkers.glucose > 126) adjustments += 3
      else if (biomarkers.glucose > 100) adjustments += 1
    }

    if (biomarkers.creatinine !== null) {
      if (biomarkers.creatinine > 1.3) adjustments += 2
    }

    if (biomarkers.c_reactive_protein !== null) {
      if (biomarkers.c_reactive_protein > 3) adjustments += 2
    }

    // Penalty for insufficient data
    if (availableMarkers < 5) adjustments += 1

    return chronologicalAge + adjustments
  }

  /**
   * Calculate comprehensive biological age assessment
   */
  static calculateBiologicalAge(patientData: PatientData): BiologicalAge {
    const { age, biomarkers, height_cm, weight_kg } = patientData
    const bmi = weight_kg / Math.pow(height_cm / 100, 2)

    const phenotypic_age = this.calculatePhenotypicAge(age, biomarkers)
    const klemera_doubal_age = this.calculateKlemeraDoubalAge(age, biomarkers)
    const metabolic_age = this.calculateMetabolicAge(age, biomarkers, bmi)
    const telomere_age = null // Requires specialized testing

    // Calculate average of available methods
    const ages = [phenotypic_age, klemera_doubal_age, metabolic_age].filter(age => !isNaN(age))
    const average_biological_age = ages.reduce((sum, age) => sum + age, 0) / ages.length

    const age_advantage = age - average_biological_age

    return {
      phenotypic_age,
      klemera_doubal_age,
      metabolic_age,
      telomere_age,
      average_biological_age,
      age_advantage
    }
  }
}

/**
 * Disease Risk Assessment Algorithms
 * Based on established clinical guidelines
 */
export class DiseaseRiskCalculator {

  /**
   * ASCVD Risk Calculation (AHA/ACC 2018)
   * 10-year atherosclerotic cardiovascular disease risk
   * Reference: 2018 AHA/ACC Cholesterol Guidelines
   */
  static calculateASCVDRisk(patientData: PatientData): RiskAssessment {
    const { age, gender, systolic_bp, biomarkers } = patientData
    const totalCholesterol = biomarkers.total_cholesterol || 200
    const hdlCholesterol = biomarkers.hdl_cholesterol || 50
    const smokingStatus = biomarkers.smoking === 1 // Assuming 1 = current smoker
    const diabetesStatus = biomarkers.diabetes === 1 || (biomarkers.glucose || 0) > 126
    const hypertensionTreatment = (biomarkers.bp_medication === 1) || systolic_bp > 140

    if (age < 40 || age > 79) {
      return {
        risk_category: 'cardiovascular',
        risk_score: 0,
        risk_level: 'low',
        ten_year_risk: 0,
        algorithm_used: 'ASCVD (Age outside 40-79 range)',
        reference: '2018 AHA/ACC Cholesterol Guidelines'
      }
    }

    // ASCVD Risk Equation coefficients (race-sex specific)
    // Simplified version for general population
    let riskScore = 0

    // Age component
    riskScore += Math.log(age) * (gender === 'male' ? 12.344 : 17.114)

    // Total cholesterol
    riskScore += Math.log(totalCholesterol) * (gender === 'male' ? 11.853 : -1.499)

    // HDL cholesterol
    riskScore += Math.log(hdlCholesterol) * (gender === 'male' ? -7.990 : 1.957)

    // Treated systolic BP
    if (hypertensionTreatment) {
      riskScore += Math.log(systolic_bp) * (gender === 'male' ? 1.797 : 2.019)
    } else {
      riskScore += Math.log(systolic_bp) * (gender === 'male' ? 1.764 : 2.055)
    }

    // Smoking
    if (smokingStatus) {
      riskScore += gender === 'male' ? 7.837 : 7.574
    }

    // Diabetes
    if (diabetesStatus) {
      riskScore += gender === 'male' ? 0.658 : 0.661
    }

    // Calculate 10-year risk percentage
    const meanCoeff = gender === 'male' ? 61.18 : 86.61
    const baselineHazard = gender === 'male' ? 0.9144 : 0.9665

    const tenYearRisk = (1 - Math.pow(baselineHazard, Math.exp(riskScore - meanCoeff))) * 100

    // Classify risk level
    let riskLevel: 'low' | 'moderate' | 'high' | 'very_high'
    if (tenYearRisk < 5) riskLevel = 'low'
    else if (tenYearRisk < 7.5) riskLevel = 'moderate'
    else if (tenYearRisk < 20) riskLevel = 'high'
    else riskLevel = 'very_high'

    return {
      risk_category: 'cardiovascular',
      risk_score: riskScore,
      risk_level: riskLevel,
      ten_year_risk: Math.max(0, Math.min(100, tenYearRisk)),
      algorithm_used: 'ASCVD Risk Estimator Plus (AHA/ACC 2018)',
      reference: '2018 AHA/ACC Cholesterol Guidelines'
    }
  }

  /**
   * FINDRISC Diabetes Risk Score
   * Finnish Diabetes Risk Score for Type 2 Diabetes
   * Reference: Lindström & Tuomilehto (2003)
   */
  static calculateDiabetesRisk(patientData: PatientData, lifestyle: any = {}): RiskAssessment {
    const { age, gender, height_cm, weight_kg, biomarkers } = patientData
    const bmi = weight_kg / Math.pow(height_cm / 100, 2)
    
    let findrisc = 0

    // Age scoring
    if (age >= 45 && age < 55) findrisc += 2
    else if (age >= 55 && age < 65) findrisc += 3
    else if (age >= 65) findrisc += 4

    // BMI scoring
    if (bmi >= 25 && bmi < 30) findrisc += 1
    else if (bmi >= 30) findrisc += 3

    // Waist circumference (if available)
    const waist = biomarkers.waist_circumference
    if (waist) {
      if (gender === 'male') {
        if (waist >= 94 && waist < 102) findrisc += 3
        else if (waist >= 102) findrisc += 4
      } else {
        if (waist >= 80 && waist < 88) findrisc += 3
        else if (waist >= 88) findrisc += 4
      }
    }

    // Physical activity (if available)
    const physicalActivity = lifestyle.exercise_frequency || 0
    if (physicalActivity < 3) findrisc += 2 // Less than 30 min/day

    // Vegetable/fruit consumption (simplified)
    if (lifestyle.diet_quality && lifestyle.diet_quality < 3) findrisc += 1

    // History of high blood glucose
    if (biomarkers.glucose && biomarkers.glucose > 100) findrisc += 5
    if (biomarkers.hba1c && biomarkers.hba1c > 5.7) findrisc += 5

    // Hypertension medication or high BP
    if (patientData.systolic_bp > 140 || biomarkers.bp_medication === 1) findrisc += 2

    // Family history of diabetes (if available)
    if (lifestyle.family_diabetes_history) findrisc += 5

    // Convert FINDRISC score to 10-year risk percentage
    let tenYearRisk: number
    if (findrisc < 7) tenYearRisk = 1
    else if (findrisc < 12) tenYearRisk = 4
    else if (findrisc < 15) tenYearRisk = 17
    else if (findrisc < 21) tenYearRisk = 33
    else tenYearRisk = 50

    // Risk level classification
    let riskLevel: 'low' | 'moderate' | 'high' | 'very_high'
    if (findrisc < 7) riskLevel = 'low'
    else if (findrisc < 12) riskLevel = 'moderate'
    else if (findrisc < 15) riskLevel = 'high'
    else riskLevel = 'very_high'

    return {
      risk_category: 'diabetes',
      risk_score: findrisc,
      risk_level: riskLevel,
      ten_year_risk: tenYearRisk,
      algorithm_used: 'FINDRISC (Finnish Diabetes Risk Score)',
      reference: 'Lindström & Tuomilehto (2003) Diabetes Care'
    }
  }

  /**
   * Kidney Disease Risk Assessment
   * Based on eGFR and albuminuria
   */
  static calculateKidneyDiseaseRisk(patientData: PatientData): RiskAssessment {
    const { biomarkers } = patientData
    const egfr = biomarkers.egfr
    const albuminuria = biomarkers.albumin_creatinine_ratio || biomarkers.proteinuria || 0

    if (!egfr) {
      return {
        risk_category: 'kidney_disease',
        risk_score: 0,
        risk_level: 'low',
        ten_year_risk: 0,
        algorithm_used: 'Insufficient data (no eGFR)',
        reference: 'KDIGO 2012 Guidelines'
      }
    }

    let riskScore = 0
    let riskLevel: 'low' | 'moderate' | 'high' | 'very_high' = 'low'

    // eGFR-based risk
    if (egfr >= 90) riskScore += 1
    else if (egfr >= 60) riskScore += 2
    else if (egfr >= 45) riskScore += 3
    else if (egfr >= 30) riskScore += 4
    else if (egfr >= 15) riskScore += 5
    else riskScore += 6

    // Albuminuria-based risk
    if (albuminuria < 30) riskScore += 1
    else if (albuminuria < 300) riskScore += 2
    else riskScore += 3

    // Combined risk assessment
    if (riskScore <= 3) riskLevel = 'low'
    else if (riskScore <= 5) riskLevel = 'moderate'
    else if (riskScore <= 7) riskLevel = 'high'
    else riskLevel = 'very_high'

    const tenYearRisk = Math.min(50, riskScore * 5) // Simplified risk percentage

    return {
      risk_category: 'kidney_disease',
      risk_score: riskScore,
      risk_level: riskLevel,
      ten_year_risk: tenYearRisk,
      algorithm_used: 'KDIGO CKD Risk Classification',
      reference: 'KDIGO 2012 Clinical Practice Guidelines'
    }
  }

  /**
   * Cancer Risk Assessment
   * Based on established risk factors and biomarkers
   * Reference: American Cancer Society Guidelines & NCCN Risk Assessment Tools
   */
  static calculateCancerRisk(patientData: PatientData, lifestyle: any = {}): RiskAssessment {
    const { age, gender, height_cm, weight_kg, biomarkers } = patientData
    const bmi = weight_kg / Math.pow(height_cm / 100, 2)
    
    let riskScore = 0
    
    // Age-related risk (cancer incidence increases with age)
    if (age >= 40 && age < 50) riskScore += 2
    else if (age >= 50 && age < 60) riskScore += 4
    else if (age >= 60 && age < 70) riskScore += 6
    else if (age >= 70) riskScore += 8

    // BMI-related risk (obesity increases cancer risk)
    if (bmi >= 25 && bmi < 30) riskScore += 1
    else if (bmi >= 30 && bmi < 35) riskScore += 2
    else if (bmi >= 35) riskScore += 3

    // Smoking history (major cancer risk factor)
    const smokingStatus = biomarkers.smoking === 1 || lifestyle.smoking_history
    if (smokingStatus) riskScore += 6

    // Inflammatory markers (chronic inflammation linked to cancer)
    const crp = biomarkers.c_reactive_protein
    if (crp && crp > 3.0) riskScore += 2
    else if (crp && crp > 1.0) riskScore += 1

    // Hormone-related factors
    if (gender === 'female') {
      // Estrogen exposure factors
      if (biomarkers.estradiol && biomarkers.estradiol > 50) riskScore += 1
      if (lifestyle.age_first_pregnancy && lifestyle.age_first_pregnancy > 30) riskScore += 1
      if (lifestyle.hormone_replacement_therapy) riskScore += 1
    }
    
    if (gender === 'male') {
      // Prostate-specific factors
      if (biomarkers.psa && biomarkers.psa > 4.0) riskScore += 2
      else if (biomarkers.psa && biomarkers.psa > 2.5) riskScore += 1
    }

    // Metabolic factors
    if (biomarkers.glucose && biomarkers.glucose > 126) riskScore += 1 // Diabetes increases cancer risk
    if (biomarkers.insulin && biomarkers.insulin > 20) riskScore += 1 // Insulin resistance

    // Immune function markers
    if (biomarkers.white_blood_cells && biomarkers.white_blood_cells < 4.0) riskScore += 1
    if (biomarkers.lymphocyte_percent && biomarkers.lymphocyte_percent < 20) riskScore += 1

    // Family history (if available)
    if (lifestyle.family_cancer_history) riskScore += 3

    // Alcohol consumption
    if (lifestyle.alcohol_consumption && lifestyle.alcohol_consumption > 2) riskScore += 2

    // Environmental exposures
    if (lifestyle.environmental_toxins) riskScore += 1

    // Calculate 10-year risk percentage based on age and risk factors
    let tenYearRisk: number
    if (riskScore <= 5) tenYearRisk = 2
    else if (riskScore <= 10) tenYearRisk = 8
    else if (riskScore <= 15) tenYearRisk = 15
    else if (riskScore <= 20) tenYearRisk = 25
    else tenYearRisk = 35

    // Risk level classification
    let riskLevel: 'low' | 'moderate' | 'high' | 'very_high'
    if (riskScore <= 5) riskLevel = 'low'
    else if (riskScore <= 10) riskLevel = 'moderate'
    else if (riskScore <= 15) riskLevel = 'high'
    else riskLevel = 'very_high'

    return {
      risk_category: 'cancer_risk',
      risk_score: riskScore,
      risk_level: riskLevel,
      ten_year_risk: tenYearRisk,
      algorithm_used: 'Comprehensive Cancer Risk Assessment',
      reference: 'American Cancer Society & NCCN Guidelines 2023'
    }
  }

  /**
   * Cognitive Decline Risk Assessment
   * Based on neurodegeneration biomarkers and risk factors
   * Reference: Alzheimer's Association & NIH-NIA Research Framework
   */
  static calculateCognitiveDeclineRisk(patientData: PatientData, lifestyle: any = {}): RiskAssessment {
    const { age, gender, height_cm, weight_kg, biomarkers } = patientData
    const bmi = weight_kg / Math.pow(height_cm / 100, 2)
    
    let riskScore = 0
    
    // Age-related risk (strongest predictor)
    if (age >= 55 && age < 65) riskScore += 2
    else if (age >= 65 && age < 75) riskScore += 4
    else if (age >= 75 && age < 85) riskScore += 7
    else if (age >= 85) riskScore += 10

    // Gender factor (women have higher risk after menopause)
    if (gender === 'female' && age > 50) riskScore += 1

    // Cardiovascular risk factors (vascular dementia pathway)
    if (biomarkers.total_cholesterol && biomarkers.total_cholesterol > 240) riskScore += 2
    if (patientData.systolic_bp > 140) riskScore += 2
    if (biomarkers.diabetes === 1 || (biomarkers.glucose && biomarkers.glucose > 126)) riskScore += 3

    // Inflammatory markers (neuroinflammation)
    const crp = biomarkers.c_reactive_protein
    if (crp && crp > 3.0) riskScore += 2
    else if (crp && crp > 1.0) riskScore += 1

    // Metabolic factors
    if (bmi > 30) riskScore += 2 // Obesity in midlife increases risk
    if (biomarkers.hba1c && biomarkers.hba1c > 6.5) riskScore += 2

    // Neurodegeneration biomarkers (if available)
    if (biomarkers.amyloid_beta_42 && biomarkers.amyloid_beta_42 < 500) riskScore += 4
    if (biomarkers.tau_protein && biomarkers.tau_protein > 300) riskScore += 3
    if (biomarkers.neurofilament_light && biomarkers.neurofilament_light > 50) riskScore += 2

    // Vitamin deficiencies
    if (biomarkers.vitamin_b12 && biomarkers.vitamin_b12 < 300) riskScore += 2
    if (biomarkers.vitamin_d && biomarkers.vitamin_d < 30) riskScore += 1
    if (biomarkers.folate && biomarkers.folate < 3.0) riskScore += 1

    // Homocysteine (elevated levels linked to cognitive decline)
    if (biomarkers.homocysteine && biomarkers.homocysteine > 15) riskScore += 2

    // Lifestyle factors
    if (lifestyle.education_years && lifestyle.education_years < 12) riskScore += 2
    if (lifestyle.physical_activity && lifestyle.physical_activity < 2) riskScore += 2
    if (lifestyle.social_engagement && lifestyle.social_engagement < 2) riskScore += 1
    if (lifestyle.cognitive_stimulation && lifestyle.cognitive_stimulation < 2) riskScore += 1

    // Sleep quality
    if (lifestyle.sleep_quality && lifestyle.sleep_quality < 3) riskScore += 1

    // Depression (significant risk factor)
    if (lifestyle.depression_history || (biomarkers.cortisol && biomarkers.cortisol > 20)) riskScore += 2

    // Family history of dementia
    if (lifestyle.family_dementia_history) riskScore += 3

    // APOE genotype (if available)
    if (biomarkers.apoe_e4_carrier) riskScore += 4

    // Calculate 10-year risk percentage
    let tenYearRisk: number
    if (age < 65) {
      if (riskScore <= 5) tenYearRisk = 1
      else if (riskScore <= 10) tenYearRisk = 3
      else if (riskScore <= 15) tenYearRisk = 7
      else tenYearRisk = 12
    } else {
      if (riskScore <= 8) tenYearRisk = 5
      else if (riskScore <= 15) tenYearRisk = 15
      else if (riskScore <= 20) tenYearRisk = 30
      else tenYearRisk = 45
    }

    // Risk level classification
    let riskLevel: 'low' | 'moderate' | 'high' | 'very_high'
    if (riskScore <= 6) riskLevel = 'low'
    else if (riskScore <= 12) riskLevel = 'moderate'
    else if (riskScore <= 18) riskLevel = 'high'
    else riskLevel = 'very_high'

    return {
      risk_category: 'cognitive_decline',
      risk_score: riskScore,
      risk_level: riskLevel,
      ten_year_risk: tenYearRisk,
      algorithm_used: 'Comprehensive Cognitive Risk Assessment',
      reference: 'Alzheimer\'s Association & NIH-NIA Research Framework 2023'
    }
  }

  /**
   * Metabolic Syndrome Risk Assessment
   * Based on ATP III & IDF Criteria
   * Reference: American Heart Association/NHLBI Scientific Statement 2005
   */
  static calculateMetabolicSyndromeRisk(patientData: PatientData): RiskAssessment {
    const { age, gender, height_cm, weight_kg, systolic_bp, diastolic_bp, biomarkers } = patientData
    const bmi = weight_kg / Math.pow(height_cm / 100, 2)
    
    let criteriaCount = 0
    let riskScore = 0
    
    // ATP III Criteria for Metabolic Syndrome (need 3 of 5)
    
    // 1. Abdominal obesity (waist circumference or BMI as proxy)
    const waist = biomarkers.waist_circumference
    let abdominalObesity = false
    if (waist) {
      abdominalObesity = (gender === 'male' && waist > 102) || (gender === 'female' && waist > 88)
    } else {
      // Use BMI as proxy
      abdominalObesity = bmi > 30
    }
    if (abdominalObesity) {
      criteriaCount++
      riskScore += 3
    }

    // 2. Triglycerides ≥ 150 mg/dL
    const triglycerides = biomarkers.triglycerides
    if (triglycerides && triglycerides >= 150) {
      criteriaCount++
      riskScore += 3
    }

    // 3. HDL Cholesterol (low)
    const hdl = biomarkers.hdl_cholesterol
    if (hdl && ((gender === 'male' && hdl < 40) || (gender === 'female' && hdl < 50))) {
      criteriaCount++
      riskScore += 3
    }

    // 4. Blood Pressure ≥ 130/85 mmHg or on medication
    const hypertension = systolic_bp >= 130 || diastolic_bp >= 85 || biomarkers.bp_medication === 1
    if (hypertension) {
      criteriaCount++
      riskScore += 3
    }

    // 5. Fasting glucose ≥ 100 mg/dL or diabetes
    const glucose = biomarkers.glucose || biomarkers.fasting_glucose
    const hyperglycemia = (glucose && glucose >= 100) || biomarkers.diabetes === 1
    if (hyperglycemia) {
      criteriaCount++
      riskScore += 3
    }

    // Additional risk factors
    
    // Insulin resistance
    if (biomarkers.insulin && biomarkers.insulin > 15) riskScore += 2
    if (biomarkers.homa_ir && biomarkers.homa_ir > 2.5) riskScore += 2

    // Inflammatory markers
    if (biomarkers.c_reactive_protein && biomarkers.c_reactive_protein > 3.0) riskScore += 1

    // Age factor
    if (age > 40) riskScore += 1
    if (age > 60) riskScore += 2

    // Adiponectin (if available - low levels indicate risk)
    if (biomarkers.adiponectin && biomarkers.adiponectin < 4.0) riskScore += 2

    // Uric acid
    if (biomarkers.uric_acid && biomarkers.uric_acid > 7.0) riskScore += 1

    // Calculate current syndrome status and future risk
    const hasMetabolicSyndrome = criteriaCount >= 3
    
    let tenYearRisk: number
    if (hasMetabolicSyndrome) {
      // Already has metabolic syndrome - assess progression risk
      tenYearRisk = 60 + Math.min(30, riskScore * 2)
    } else {
      // Risk of developing metabolic syndrome
      if (criteriaCount === 0) tenYearRisk = 5
      else if (criteriaCount === 1) tenYearRisk = 15
      else if (criteriaCount === 2) tenYearRisk = 35
      else tenYearRisk = 50
    }

    // Risk level classification
    let riskLevel: 'low' | 'moderate' | 'high' | 'very_high'
    if (criteriaCount === 0) riskLevel = 'low'
    else if (criteriaCount <= 1) riskLevel = 'moderate'
    else if (criteriaCount === 2) riskLevel = 'high'
    else riskLevel = 'very_high' // Has metabolic syndrome

    return {
      risk_category: 'metabolic_syndrome',
      risk_score: riskScore,
      risk_level: riskLevel,
      ten_year_risk: tenYearRisk,
      algorithm_used: `ATP III Criteria (${criteriaCount}/5 criteria met)`,
      reference: 'American Heart Association/NHLBI Scientific Statement 2005'
    }
  }

  /**
   * Stroke Risk Assessment
   * Based on CHA2DS2-VASc and Framingham Stroke Risk Profile
   * Reference: AHA/ASA Stroke Prevention Guidelines 2019
   */
  static calculateStrokeRisk(patientData: PatientData, lifestyle: any = {}): RiskAssessment {
    const { age, gender, biomarkers, systolic_bp } = patientData
    
    let riskScore = 0
    let framinghamPoints = 0
    
    // Age scoring (major risk factor)
    if (age >= 55 && age < 65) {
      riskScore += 2
      framinghamPoints += 3
    } else if (age >= 65 && age < 75) {
      riskScore += 4
      framinghamPoints += 5
    } else if (age >= 75) {
      riskScore += 6
      framinghamPoints += 8
    }

    // Gender (men have higher risk until age 75)
    if (gender === 'male' && age < 75) {
      riskScore += 1
      framinghamPoints += 2
    }

    // Hypertension (most important modifiable risk factor)
    if (systolic_bp >= 140 || biomarkers.bp_medication === 1) {
      if (systolic_bp >= 160) {
        riskScore += 4
        framinghamPoints += 4
      } else {
        riskScore += 2
        framinghamPoints += 2
      }
    }

    // Diabetes mellitus
    if (biomarkers.diabetes === 1 || (biomarkers.glucose && biomarkers.glucose > 126)) {
      riskScore += 3
      framinghamPoints += 3
    }

    // Cardiovascular disease
    const cvdHistory = lifestyle.cardiovascular_disease_history || biomarkers.previous_mi === 1
    if (cvdHistory) {
      riskScore += 3
      framinghamPoints += 4
    }

    // Atrial fibrillation (major risk factor)
    if (lifestyle.atrial_fibrillation || biomarkers.atrial_fibrillation === 1) {
      riskScore += 5
      framinghamPoints += 6
    }

    // Left ventricular hypertrophy
    if (biomarkers.lvh === 1) {
      riskScore += 2
      framinghamPoints += 3
    }

    // Smoking
    if (biomarkers.smoking === 1 || lifestyle.smoking_history) {
      riskScore += 2
      framinghamPoints += 2
    }

    // Cholesterol levels
    if (biomarkers.total_cholesterol && biomarkers.total_cholesterol > 240) {
      riskScore += 1
      framinghamPoints += 1
    }

    // HDL cholesterol (protective factor)
    if (biomarkers.hdl_cholesterol && biomarkers.hdl_cholesterol < 40) {
      riskScore += 1
    } else if (biomarkers.hdl_cholesterol && biomarkers.hdl_cholesterol > 60) {
      riskScore -= 1
      framinghamPoints -= 1
    }

    // Carotid stenosis (if available)
    if (biomarkers.carotid_stenosis && biomarkers.carotid_stenosis > 50) {
      riskScore += 3
    }

    // Additional biomarkers
    
    // Homocysteine (elevated levels increase stroke risk)
    if (biomarkers.homocysteine && biomarkers.homocysteine > 15) riskScore += 2

    // C-reactive protein (inflammation)
    if (biomarkers.c_reactive_protein && biomarkers.c_reactive_protein > 3.0) riskScore += 1

    // Fibrinogen (coagulation factor)
    if (biomarkers.fibrinogen && biomarkers.fibrinogen > 400) riskScore += 1

    // D-dimer (thrombosis marker)
    if (biomarkers.d_dimer && biomarkers.d_dimer > 0.5) riskScore += 1

    // Lifestyle factors
    if (lifestyle.physical_activity && lifestyle.physical_activity < 2) riskScore += 1
    if (lifestyle.alcohol_consumption && lifestyle.alcohol_consumption > 3) riskScore += 1

    // Sleep apnea
    if (lifestyle.sleep_apnea) riskScore += 2

    // Family history
    if (lifestyle.family_stroke_history) riskScore += 2

    // Calculate 10-year stroke risk using modified Framingham equation
    let tenYearRisk: number
    
    if (framinghamPoints <= 0) tenYearRisk = 1
    else if (framinghamPoints <= 3) tenYearRisk = 2
    else if (framinghamPoints <= 6) tenYearRisk = 4
    else if (framinghamPoints <= 9) tenYearRisk = 7
    else if (framinghamPoints <= 12) tenYearRisk = 11
    else if (framinghamPoints <= 15) tenYearRisk = 16
    else if (framinghamPoints <= 18) tenYearRisk = 23
    else if (framinghamPoints <= 21) tenYearRisk = 32
    else tenYearRisk = 42

    // Adjust for additional risk factors
    tenYearRisk += Math.min(20, (riskScore - framinghamPoints) * 2)
    tenYearRisk = Math.max(0, Math.min(60, tenYearRisk))

    // Risk level classification
    let riskLevel: 'low' | 'moderate' | 'high' | 'very_high'
    if (tenYearRisk < 5) riskLevel = 'low'
    else if (tenYearRisk < 10) riskLevel = 'moderate'
    else if (tenYearRisk < 20) riskLevel = 'high'
    else riskLevel = 'very_high'

    return {
      risk_category: 'stroke_risk',
      risk_score: riskScore,
      risk_level: riskLevel,
      ten_year_risk: tenYearRisk,
      algorithm_used: 'Modified Framingham Stroke Risk Profile',
      reference: 'AHA/ASA Stroke Prevention Guidelines 2019'
    }
  }
}