import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { BiologicalAgeCalculator, DiseaseRiskCalculator } from './medical-algorithms'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/css/*', serveStatic())
app.use('/js/*', serveStatic())

// Authentication API
app.post('/api/auth/login', async (c) => {
  const { password, country } = await c.req.json()
  
  // Validate credentials (same as demo system)
  const validPassword = '#*LonGenix42'
  const validCountries = ['US', 'Australia', 'Philippines']
  
  if (password === validPassword && validCountries.includes(country)) {
    return c.json({ 
      success: true, 
      country,
      message: 'Authentication successful' 
    })
  } else {
    return c.json({ 
      success: false, 
      error: 'Invalid credentials' 
    }, 401)
  }
})

// Dynamic report route
app.get('/report', async (c) => {
  const { env } = c
  const sessionId = c.req.query('session')
  const isDemo = c.req.query('demo') === 'true'
  
  if (!sessionId) {
    return c.html('<h1>Error: No session ID provided</h1>')
  }

  try {
    // Get session and patient data
    const session = await env.DB.prepare(`
      SELECT s.*, p.full_name, p.date_of_birth, p.gender, p.country
      FROM assessment_sessions s
      JOIN patients p ON s.patient_id = p.id
      WHERE s.id = ?
    `).bind(sessionId).first()

    if (!session) {
      return c.html('<h1>Error: Session not found</h1>')
    }

    // Get biological age results
    const bioAge = await env.DB.prepare(`
      SELECT * FROM biological_age WHERE session_id = ?
    `).bind(sessionId).first()

    // Get risk assessments
    const risks = await env.DB.prepare(`
      SELECT * FROM risk_calculations WHERE session_id = ?
    `).bind(sessionId).all()

    // Get comprehensive assessment data
    const assessmentData = await env.DB.prepare(`
      SELECT json_data FROM assessment_data WHERE session_id = ? AND data_type = 'comprehensive_lifestyle'
    `).bind(sessionId).first()

    // Parse comprehensive assessment data
    let comprehensiveData = null
    if (assessmentData) {
      try {
        comprehensiveData = JSON.parse(assessmentData.json_data)
      } catch (e) {
        console.error('Error parsing comprehensive data:', e)
      }
    }

    // Calculate age from date of birth
    const birthDate = new Date(session.date_of_birth)
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))

    // Helper functions for dynamic content generation
    function generateFunctionalMedicineSection() {
      if (!comprehensiveData) {
        return `<p class="text-gray-600 italic">Complete the comprehensive assessment to see personalized functional medicine analysis.</p>`
      }





      const systemsData = [
        {
          id: 'assimilation',
          name: 'Assimilation System',
          icon: 'fas fa-utensils',
          description: 'Digestion, absorption, microbiota/GI function',
          questions: [
            'How often do you experience bloating after meals?',
            'Do you have regular, well-formed bowel movements?',
            'How would you rate your digestive comfort overall?',
            'Do you have known food sensitivities or intolerances?',
            'How often do you experience gas or abdominal discomfort?',
            'Do you feel satisfied and energized after meals?'
          ]
        },
        {
          id: 'biotransformation',
          name: 'Biotransformation & Elimination',
          icon: 'fas fa-filter',
          description: 'Detoxification and toxin elimination',
          questions: [
            'How often do you feel fatigued or sluggish?',
            'Do you have regular bowel movements (at least once daily)?',
            'How well do you tolerate alcohol or caffeine?',
            'Do you sweat easily during physical activity?',
            'How sensitive are you to strong odors or chemicals?',
            'How would you rate your overall energy for detoxification?'
          ]
        },
        {
          id: 'defense',
          name: 'Defense & Repair',
          icon: 'fas fa-shield-virus',
          description: 'Immune function, inflammation, and infection/microbes',
          questions: [
            'How often do you get colds or infections?',
            'How quickly do you recover from illness?',
            'Do you have any autoimmune conditions or symptoms?',
            'How well do cuts and wounds heal?',
            'Do you experience chronic inflammation or pain?',
            'How would you rate your overall immune strength?'
          ]
        },
        {
          id: 'structural',
          name: 'Structural Integrity',
          icon: 'fas fa-dumbbell',
          description: 'Musculoskeletal system and subcellular membranes',
          questions: [
            'Do you experience joint pain or stiffness?',
            'How would you rate your muscle strength?',
            'Do you have good posture and alignment?',
            'How often do you experience back or neck pain?',
            'Do you have good balance and coordination?',
            'How would you rate your overall physical mobility?'
          ]
        },
        {
          id: 'communication',
          name: 'Communication System',
          icon: 'fas fa-brain',
          description: 'Endocrine, neurotransmitters, and immune messengers',
          questions: [
            'How stable is your mood throughout the day?',
            'Do you have regular, restful sleep patterns?',
            'How well do you handle stress?',
            'Do you experience hormone-related symptoms?',
            'How sharp is your mental focus and concentration?',
            'How would you rate your emotional regulation?'
          ]
        },
        {
          id: 'energy',
          name: 'Energy System',
          icon: 'fas fa-bolt',
          description: 'Energy regulation and mitochondrial function',
          questions: [
            'How are your energy levels throughout the day?',
            'Do you experience afternoon energy crashes?',
            'How well do you recover from physical exertion?',
            'Do you feel refreshed after sleep?',
            'How stable is your energy without caffeine?',
            'How would you rate your overall vitality?'
          ]
        },
        {
          id: 'transport',
          name: 'Transport System',
          icon: 'fas fa-heartbeat',
          description: 'Cardiovascular and lymphatic systems',
          questions: [
            'Do you have good circulation (warm hands/feet)?',
            'How is your cardiovascular fitness?',
            'Do you experience swelling or fluid retention?',
            'How well do you tolerate physical activity?',
            'Do you have any heart-related symptoms?',
            'How would you rate your overall circulation?'
          ]
        }
      ]

      return systemsData.map(system => {
        // Calculate system score and collect responses
        let totalQuestions = 0
        let positiveResponses = 0
        const userResponses = []
        
        // Check both flat structure (assimilation_q1) and nested structure (functionalMedicine.assimilation.*)
        for (let i = 1; i <= 6; i++) {
          const questionKey = `${system.id}_q${i}`
          let response = null
          
          // Try flat structure first (expected from form)
          if (comprehensiveData[questionKey]) {
            response = comprehensiveData[questionKey]
          }
          // Try nested structure (what appears to be stored)
          else if (comprehensiveData.functionalMedicine && 
                   comprehensiveData.functionalMedicine[system.id]) {
            const systemData = comprehensiveData.functionalMedicine[system.id]
            // Look for question responses in nested structure
            response = systemData[`q${i}`] || systemData[questionKey] || null
          }
          
          if (response) {
            totalQuestions++
            const questionText = system.questions[i-1] || `Question ${i}`
            userResponses.push({ question: questionText, answer: response })
            
            // Score based on response type
            if (response === 'yes' || response === 'excellent' || response === 'very_good' || response === 'always' || response === 'fast' || response === 'none') {
              positiveResponses += 2
            } else if (response === 'good' || response === 'often' || response === 'normal' || response === 'mild') {
              positiveResponses += 1.5
            } else if (response === 'fair' || response === 'sometimes' || response === 'slow' || response === 'moderate') {
              positiveResponses += 1
            } else if (response === 'poor' || response === 'rarely' || response === 'never' || response === 'very_slow' || response === 'severe') {
              positiveResponses += 0.5
            }
          }
        }
        
        // If no individual questions found, check for summary data
        if (totalQuestions === 0 && comprehensiveData.functionalMedicine && 
            comprehensiveData.functionalMedicine[system.id]) {
          const systemData = comprehensiveData.functionalMedicine[system.id]
          
          // Look for any available data in this system
          Object.keys(systemData).forEach(key => {
            const value = systemData[key]
            if (value && (typeof value === 'string' || typeof value === 'number')) {
              totalQuestions++
              userResponses.push({ 
                question: key.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase()),
                answer: String(value)
              })
              
              // Score based on response type
              const strValue = String(value).toLowerCase()
              if (strValue === 'yes' || strValue === 'excellent' || strValue === 'very_good' || strValue === 'good' || strValue === 'always' || strValue === 'fast' || strValue === 'none') {
                positiveResponses += 2
              } else if (strValue === 'fair' || strValue === 'sometimes' || strValue === 'slow' || strValue === 'moderate') {
                positiveResponses += 1
              } else if (strValue === 'poor' || strValue === 'rarely' || strValue === 'never' || strValue === 'very_slow' || strValue === 'severe' || strValue === 'no') {
                positiveResponses += 0.5
              } else {
                positiveResponses += 1.5 // Default for unknown positive values
              }
            }
          })
        }
        

        
        const score = totalQuestions > 0 ? Math.round((positiveResponses / (totalQuestions * 2)) * 100) : 0
        const status = score >= 85 ? 'excellent' : score >= 70 ? 'optimal' : score >= 55 ? 'good' : 'needs-attention'
        const color = status === 'excellent' ? 'green' : status === 'optimal' ? 'blue' : status === 'good' ? 'yellow' : 'red'
        
        // Generate analysis based on responses
        let analysis = ''
        if (totalQuestions === 0) {
          analysis = `No assessment data available for ${system.name.toLowerCase()}. Complete the comprehensive assessment to see detailed analysis.`
        } else if (score >= 85) {
          analysis = `Excellent function with optimal performance indicators. ${system.name.toLowerCase()} shows strong capacity and minimal concerns.`
        } else if (score >= 70) {
          analysis = `Good overall function with some areas for optimization. ${system.name.toLowerCase()} demonstrates adequate performance with potential for enhancement.`
        } else if (score >= 55) {
          analysis = `Moderate function with several areas needing attention. ${system.name.toLowerCase()} shows mixed performance requiring targeted interventions.`
        } else {
          analysis = `Significant dysfunction requiring immediate attention. ${system.name.toLowerCase()} shows compromised performance needing comprehensive support.`
        }
        
        return `
          <div class="bg-white border-2 border-gray-200 rounded-xl p-6">
            <div class="flex items-center mb-4">
              <div class="bg-${color}-100 p-3 rounded-full mr-4">
                <i class="${system.icon} text-${color}-600 text-xl"></i>
              </div>
              <div class="flex-1">
                <h4 class="font-semibold text-lg text-gray-800">${system.name}</h4>
                <p class="text-sm text-gray-600">${system.description}</p>
              </div>
            </div>
            
            <div class="mb-4">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium">System Function Score</span>
                <span class="text-2xl font-bold text-${color}-600">${score}/100</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-${color}-600 h-2 rounded-full" style="width: ${score}%"></div>
              </div>
            </div>
            
            <div class="mb-4">
              <span class="inline-block px-3 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800">${status.toUpperCase().replace('-', ' ')}</span>
            </div>
            
            <div class="mb-4">
              <h5 class="text-sm font-semibold text-gray-700 mb-2">Clinical Analysis:</h5>
              <p class="text-xs text-gray-600">${analysis}</p>
            </div>
            
            ${userResponses.length > 0 ? `
              <div class="border-t border-gray-200 pt-4">
                <h5 class="text-sm font-semibold text-gray-700 mb-3">Assessment Responses:</h5>
                <div class="space-y-2">
                  ${userResponses.map(resp => `
                    <div class="text-xs">
                      <div class="text-gray-600 mb-1">${resp.question}</div>
                      <div class="text-${color}-700 font-medium ml-2">→ ${resp.answer.replace(/_/g, ' ').toUpperCase()}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : `
              <div class="text-xs text-gray-500 italic">No responses recorded for this system</div>
            `}
          </div>
        `
      }).join('')
    }

    function generateATMSection() {
      if (!comprehensiveData) {
        return `<p class="text-gray-600 italic">Complete the comprehensive assessment to see personalized root-cause analysis.</p>`
      }

      // Extract ATM data from comprehensive assessment
      const antecedents = []
      const triggers = []
      const mediators = []

      // Process dynamic entries
      if (comprehensiveData.antecedentsDescription && Array.isArray(comprehensiveData.antecedentsDescription)) {
        comprehensiveData.antecedentsDescription.forEach((desc, index) => {
          if (desc && desc.trim()) {
            antecedents.push({
              description: desc,
              date: comprehensiveData.antecedentsDate?.[index] || '',
              severity: comprehensiveData.antecedentsSeverity?.[index] || ''
            })
          }
        })
      }

      if (comprehensiveData.triggersDescription && Array.isArray(comprehensiveData.triggersDescription)) {
        comprehensiveData.triggersDescription.forEach((desc, index) => {
          if (desc && desc.trim()) {
            triggers.push({
              description: desc,
              date: comprehensiveData.triggersDate?.[index] || '',
              impact: comprehensiveData.triggersImpact?.[index] || ''
            })
          }
        })
      }

      if (comprehensiveData.mediatorsDescription && Array.isArray(comprehensiveData.mediatorsDescription)) {
        comprehensiveData.mediatorsDescription.forEach((desc, index) => {
          if (desc && desc.trim()) {
            mediators.push({
              description: desc,
              date: comprehensiveData.mediatorsDate?.[index] || '',
              frequency: comprehensiveData.mediatorsFrequency?.[index] || ''
            })
          }
        })
      }

      return `
        <div class="grid md:grid-cols-3 gap-8 mb-8">
          <!-- Antecedents -->
          <div class="bg-blue-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-blue-800 mb-4">
              <i class="fas fa-history mr-2"></i>Antecedents (Predisposing)
            </h3>
            <p class="text-sm text-gray-600 mb-4">Factors that create vulnerability or lay the groundwork for dysfunction</p>
            <div class="space-y-3">
              ${comprehensiveData.geneticPredispositions ? `
                <div class="bg-white rounded-lg p-3 border border-blue-200">
                  <h4 class="font-semibold text-blue-700 text-sm">Genetic Predispositions</h4>
                  <p class="text-xs text-gray-600 mt-2">${comprehensiveData.geneticPredispositions}</p>
                </div>
              ` : ''}
              
              ${comprehensiveData.earlyStress && comprehensiveData.earlyStress !== '' ? `
                <div class="bg-white rounded-lg p-3 border border-blue-200">
                  <h4 class="font-semibold text-blue-700 text-sm">Early Life Stress/Trauma</h4>
                  <p class="text-xs text-gray-600 mt-2">Level: ${comprehensiveData.earlyStress.replace('-', ' ').toUpperCase()}</p>
                </div>
              ` : ''}
              
              ${antecedents.map(item => `
                <div class="bg-white rounded-lg p-3 border border-blue-200">
                  <h4 class="font-semibold text-blue-700 text-sm">Predisposing Factor ${item.date ? `(${item.date})` : ''}</h4>
                  <p class="text-xs text-gray-600 mt-2">${item.description}</p>
                  ${item.severity ? `<p class="text-xs text-blue-600 mt-1">Severity: ${item.severity}</p>` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Triggers -->
          <div class="bg-red-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-red-800 mb-4">
              <i class="fas fa-bolt mr-2"></i>Triggers (Precipitating)
            </h3>
            <p class="text-sm text-gray-600 mb-4">Events that initiated or worsened current health concerns</p>
            <div class="space-y-3">
              ${comprehensiveData.symptomOnset ? `
                <div class="bg-white rounded-lg p-3 border border-red-200">
                  <h4 class="font-semibold text-red-700 text-sm">Symptom Onset</h4>
                  <p class="text-xs text-gray-600 mt-2">${comprehensiveData.symptomOnset}</p>
                </div>
              ` : ''}
              
              ${triggers.map(item => `
                <div class="bg-white rounded-lg p-3 border border-red-200">
                  <h4 class="font-semibold text-red-700 text-sm">Trigger Event ${item.date ? `(${item.date})` : ''}</h4>
                  <p class="text-xs text-gray-600 mt-2">${item.description}</p>
                  ${item.impact ? `<p class="text-xs text-red-600 mt-1">Impact: ${item.impact}</p>` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Mediators -->
          <div class="bg-green-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-green-800 mb-4">
              <i class="fas fa-sync mr-2"></i>Mediators (Perpetuating)
            </h3>
            <p class="text-sm text-gray-600 mb-4">Ongoing factors that maintain or worsen current patterns</p>
            <div class="space-y-3">
              ${comprehensiveData.healthBarriers ? `
                <div class="bg-white rounded-lg p-3 border border-green-200">
                  <h4 class="font-semibold text-green-700 text-sm">Health Barriers</h4>
                  <p class="text-xs text-gray-600 mt-2">${comprehensiveData.healthBarriers}</p>
                </div>
              ` : ''}
              
              ${mediators.map(item => `
                <div class="bg-white rounded-lg p-3 border border-green-200">
                  <h4 class="font-semibold text-green-700 text-sm">Ongoing Factor ${item.date ? `(Started ${item.date})` : ''}</h4>
                  <p class="text-xs text-gray-600 mt-2">${item.description}</p>
                  ${item.frequency ? `<p class="text-xs text-green-600 mt-1">Frequency: ${item.frequency}</p>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `
    }

    function generateLifestyleSection() {
      if (!comprehensiveData) {
        return `<p class="text-gray-600 italic">Complete the comprehensive assessment to see personalized lifestyle analysis.</p>`
      }

      // Extract lifestyle data
      const exercise = {
        frequency: comprehensiveData.exerciseFrequency || 'Not specified',
        minutes: comprehensiveData.exerciseMinutes || 'Not specified',
        types: []
      }

      // Process exercise types
      if (comprehensiveData.exerciseTypes) {
        const types = Array.isArray(comprehensiveData.exerciseTypes) ? comprehensiveData.exerciseTypes : [comprehensiveData.exerciseTypes]
        exercise.types = types.filter(type => type) // Remove empty values
        if (exercise.types.includes('other') && comprehensiveData.exerciseTypesOther) {
          exercise.types = exercise.types.filter(type => type !== 'other')
          exercise.types.push(comprehensiveData.exerciseTypesOther)
        }
      }

      const sleep = {
        hours: comprehensiveData.sleepHours || 'Not specified',
        quality: comprehensiveData.sleepQuality || 'Not specified'
      }

      const stress = {
        level: comprehensiveData.stressLevel || 'Not specified',
        techniques: []
      }

      if (comprehensiveData.stressTechniques) {
        const techniques = Array.isArray(comprehensiveData.stressTechniques) ? comprehensiveData.stressTechniques : [comprehensiveData.stressTechniques]
        stress.techniques = techniques.filter(tech => tech)
      }

      return `
        <div class="grid md:grid-cols-3 gap-6">
          <!-- Exercise -->
          <div class="bg-blue-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-blue-800 mb-4">
              <i class="fas fa-dumbbell mr-2"></i>Physical Activity
            </h3>
            <div class="space-y-3">
              <div>
                <p class="text-sm font-medium text-gray-700">Frequency per week:</p>
                <p class="text-sm text-gray-600">${exercise.frequency}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-700">Duration per session:</p>
                <p class="text-sm text-gray-600">${exercise.minutes} minutes</p>
              </div>
              ${exercise.types.length > 0 ? `
                <div>
                  <p class="text-sm font-medium text-gray-700">Activity types:</p>
                  <div class="flex flex-wrap gap-1 mt-1">
                    ${exercise.types.map(type => `
                      <span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">${type}</span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Sleep -->
          <div class="bg-purple-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-purple-800 mb-4">
              <i class="fas fa-moon mr-2"></i>Sleep Quality
            </h3>
            <div class="space-y-3">
              <div>
                <p class="text-sm font-medium text-gray-700">Hours per night:</p>
                <p class="text-sm text-gray-600">${sleep.hours}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-700">Sleep quality:</p>
                <p class="text-sm text-gray-600">${sleep.quality}</p>
              </div>
            </div>
          </div>

          <!-- Stress Management -->
          <div class="bg-red-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-red-800 mb-4">
              <i class="fas fa-brain mr-2"></i>Stress Management
            </h3>
            <div class="space-y-3">
              <div>
                <p class="text-sm font-medium text-gray-700">Stress level (1-5):</p>
                <p class="text-sm text-gray-600">${stress.level}</p>
              </div>
              ${stress.techniques.length > 0 ? `
                <div>
                  <p class="text-sm font-medium text-gray-700">Management techniques:</p>
                  <div class="flex flex-wrap gap-1 mt-1">
                    ${stress.techniques.map(tech => `
                      <span class="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded">${tech}</span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `
    }

    function generateBiomarkerSection() {
      if (!comprehensiveData) {
        return `<p class="text-gray-600 italic">Complete the comprehensive assessment to see biomarker analysis.</p>`
      }



      const biomarkerCategories = {
        'Metabolic Panel': [
          { name: 'glucose', label: 'Fasting Glucose', unit: 'mg/dL', range: '70-99' },
          { name: 'hba1c', label: 'HbA1c', unit: '%', range: '4.0-5.6' },
          { name: 'insulin', label: 'Fasting Insulin', unit: 'μU/mL', range: '2.6-24.9' },
          { name: 'cPeptide', label: 'C-Peptide', unit: 'ng/mL', range: '1.1-4.4' },
          { name: 'fructosamine', label: 'Fructosamine', unit: 'μmol/L', range: '205-285' }
        ],
        'Lipid Panel': [
          { name: 'totalCholesterol', label: 'Total Cholesterol', unit: 'mg/dL', range: '<200' },
          { name: 'hdlCholesterol', label: 'HDL Cholesterol', unit: 'mg/dL', range: '>40 (M), >50 (F)' },
          { name: 'ldlCholesterol', label: 'LDL Cholesterol', unit: 'mg/dL', range: '<100' },
          { name: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', range: '<150' },
          { name: 'nonHdlCholesterol', label: 'Non-HDL Cholesterol', unit: 'mg/dL', range: '<130' },
          { name: 'apoA1', label: 'Apolipoprotein A1', unit: 'mg/dL', range: '>120 (M), >140 (F)' },
          { name: 'apoB', label: 'Apolipoprotein B', unit: 'mg/dL', range: '<90' },
          { name: 'lipoproteinA', label: 'Lipoprotein(a)', unit: 'mg/dL', range: '<30' }
        ],
        'Kidney Function': [
          { name: 'creatinine', label: 'Creatinine', unit: 'mg/dL', range: '0.6-1.2' },
          { name: 'bun', label: 'BUN (Blood Urea Nitrogen)', unit: 'mg/dL', range: '7-20' },
          { name: 'egfr', label: 'eGFR', unit: 'mL/min/1.73m²', range: '>90' },
          { name: 'albumin', label: 'Albumin', unit: 'g/dL', range: '3.5-5.0' },
          { name: 'microalbumin', label: 'Microalbumin (Urine)', unit: 'mg/g creatinine', range: '<30' },
          { name: 'cystatinC', label: 'Cystatin C', unit: 'mg/L', range: '0.53-0.95' }
        ],
        'Liver Function': [
          { name: 'alt', label: 'ALT (Alanine Transaminase)', unit: 'U/L', range: '7-56' },
          { name: 'ast', label: 'AST (Aspartate Transaminase)', unit: 'U/L', range: '10-40' },
          { name: 'alp', label: 'Alkaline Phosphatase', unit: 'U/L', range: '44-147' },
          { name: 'totalBilirubin', label: 'Total Bilirubin', unit: 'mg/dL', range: '0.3-1.2' },
          { name: 'directBilirubin', label: 'Direct Bilirubin', unit: 'mg/dL', range: '0.0-0.3' },
          { name: 'ggt', label: 'GGT (Gamma-Glutamyl Transferase)', unit: 'U/L', range: '9-48' }
        ],
        'Thyroid Function': [
          { name: 'tsh', label: 'TSH (Thyroid Stimulating Hormone)', unit: 'μIU/mL', range: '0.27-4.20' },
          { name: 'freeT4', label: 'Free T4', unit: 'ng/dL', range: '0.93-1.70' },
          { name: 'freeT3', label: 'Free T3', unit: 'pg/mL', range: '2.0-4.4' },
          { name: 'reverseT3', label: 'Reverse T3', unit: 'ng/dL', range: '9.2-24.1' },
          { name: 'thyroglobulinAb', label: 'Thyroglobulin Antibodies', unit: 'IU/mL', range: '<4' },
          { name: 'tpoAb', label: 'TPO Antibodies', unit: 'IU/mL', range: '<34' }
        ],
        'Inflammatory Markers': [
          { name: 'crp', label: 'C-Reactive Protein (hs-CRP)', unit: 'mg/L', range: '<3.0' },
          { name: 'esr', label: 'ESR (Erythrocyte Sedimentation Rate)', unit: 'mm/hr', range: '<20 (M), <30 (F)' },
          { name: 'interleukin6', label: 'Interleukin-6 (IL-6)', unit: 'pg/mL', range: '<3.4' },
          { name: 'tnfAlpha', label: 'TNF-α (Tumor Necrosis Factor)', unit: 'pg/mL', range: '<8.1' }
        ],
        'Complete Blood Count': [
          { name: 'wbc', label: 'White Blood Cells', unit: '10³/μL', range: '4.5-11.0' },
          { name: 'rbc', label: 'Red Blood Cells', unit: '10⁶/μL', range: '4.7-6.1 (M), 4.2-5.4 (F)' },
          { name: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL', range: '14-18 (M), 12-16 (F)' },
          { name: 'hematocrit', label: 'Hematocrit', unit: '%', range: '42-52 (M), 37-47 (F)' },
          { name: 'platelets', label: 'Platelets', unit: '10³/μL', range: '150-450' },
          { name: 'neutrophils', label: 'Neutrophils', unit: '%', range: '40-74' },
          { name: 'lymphocytes', label: 'Lymphocytes', unit: '%', range: '19-48' },
          { name: 'monocytes', label: 'Monocytes', unit: '%', range: '3.4-9' }
        ],
        'Nutritional Status': [
          { name: 'vitaminD', label: 'Vitamin D (25-OH)', unit: 'ng/mL', range: '30-100' },
          { name: 'vitaminB12', label: 'Vitamin B12', unit: 'pg/mL', range: '232-1245' },
          { name: 'folate', label: 'Folate', unit: 'ng/mL', range: '2.7-17.0' },
          { name: 'ferritin', label: 'Ferritin', unit: 'ng/mL', range: '15-150 (F), 15-200 (M)' },
          { name: 'iron', label: 'Iron', unit: 'μg/dL', range: '60-170 (M), 60-140 (F)' },
          { name: 'tibc', label: 'TIBC (Total Iron Binding Capacity)', unit: 'μg/dL', range: '240-450' },
          { name: 'transferrinSat', label: 'Transferrin Saturation', unit: '%', range: '20-50' },
          { name: 'omega3Index', label: 'Omega-3 Index', unit: '%', range: '>8' }
        ],
        'Hormones (Optional)': [
          { name: 'testosterone', label: 'Testosterone (Total)', unit: 'ng/dL', range: '300-1000 (M), 15-70 (F)' },
          { name: 'freeTestosterone', label: 'Free Testosterone', unit: 'pg/mL', range: '9-30 (M), 0.3-3.2 (F)' },
          { name: 'estradiol', label: 'Estradiol', unit: 'pg/mL', range: '7-42 (M), varies with cycle (F)' },
          { name: 'progesterone', label: 'Progesterone', unit: 'ng/mL', range: '<1.4 (M), varies with cycle (F)' },
          { name: 'cortisol', label: 'Cortisol (AM)', unit: 'μg/dL', range: '6.2-19.4' },
          { name: 'dheas', label: 'DHEA-S', unit: 'μg/dL', range: '164-530 (M), 57-279 (F)' }
        ]
      }

      let enteredCount = 0
      let totalCount = 0

      const categoryHtml = Object.keys(biomarkerCategories).map(category => {
        const markers = biomarkerCategories[category]
        const categoryMarkers = markers.map(marker => {
          totalCount++
          // Check both flat structure and nested biomarkers structure
          let value = comprehensiveData[marker.name]
          if (!value && comprehensiveData.biomarkers) {
            value = comprehensiveData.biomarkers[marker.name]
          }
          const hasValue = value !== undefined && value !== null && String(value).trim() !== ''
          if (hasValue) enteredCount++
          
          return `
            <div class="bg-white rounded-lg p-4 border ${hasValue ? 'border-green-200' : 'border-gray-200'}">
              <div class="flex justify-between items-start mb-2">
                <h5 class="text-sm font-semibold text-gray-800">${marker.label}</h5>
                ${hasValue ? '<i class="fas fa-check-circle text-green-500 text-sm"></i>' : '<i class="fas fa-circle text-gray-300 text-sm"></i>'}
              </div>
              <div class="space-y-1">
                <div class="flex justify-between items-center">
                  <span class="text-lg font-bold ${hasValue ? 'text-blue-600' : 'text-gray-400'}">
                    ${hasValue ? value : '--'}
                  </span>
                  <span class="text-xs text-gray-500">${marker.unit}</span>
                </div>
                <div class="text-xs text-gray-600">
                  <span class="font-medium">Reference:</span> ${marker.range} ${marker.unit}
                </div>
                ${hasValue ? `
                  <div class="text-xs mt-2">
                    <span class="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">ENTERED</span>
                  </div>
                ` : `
                  <div class="text-xs mt-2">
                    <span class="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">NOT ENTERED</span>
                  </div>
                `}
              </div>
            </div>
          `
        }).join('')

        return `
          <div class="mb-8">
            <h4 class="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
              <i class="fas fa-flask mr-2 text-blue-600"></i>${category}
            </h4>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              ${categoryMarkers}
            </div>
          </div>
        `
      }).join('')

      return `

        <div class="mb-6">
          <div class="bg-blue-50 rounded-lg p-4 mb-6">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-lg font-semibold text-blue-800">Biomarker Summary</h4>
                <p class="text-sm text-blue-700">Comprehensive laboratory analysis with ${totalCount} total biomarkers</p>
              </div>
              <div class="text-right">
                <div class="text-3xl font-bold text-blue-600">${enteredCount}/${totalCount}</div>
                <div class="text-sm text-blue-700">Biomarkers Entered</div>
              </div>
            </div>
            <div class="mt-4">
              <div class="w-full bg-blue-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full" style="width: ${totalCount > 0 ? Math.round((enteredCount / totalCount) * 100) : 0}%"></div>
              </div>
              <p class="text-xs text-blue-600 mt-1">${totalCount > 0 ? Math.round((enteredCount / totalCount) * 100) : 0}% completion rate</p>
            </div>
          </div>
        </div>
        ${categoryHtml}
      `
    }

    function generateMentalHealthSection() {
      if (!comprehensiveData) {
        return `<p class="text-gray-600 italic">Complete the comprehensive assessment to see personalized mental health analysis.</p>`
      }

      // Calculate PHQ-9 score
      let phq9Score = 0
      let phq9Count = 0
      for (let i = 1; i <= 9; i++) {
        const response = comprehensiveData[`phq9_q${i}`]
        if (response !== undefined && response !== '') {
          phq9Score += parseInt(response) || 0
          phq9Count++
        }
      }

      // Calculate GAD-7 score
      let gad7Score = 0
      let gad7Count = 0
      for (let i = 1; i <= 7; i++) {
        const response = comprehensiveData[`gad7_q${i}`]
        if (response !== undefined && response !== '') {
          gad7Score += parseInt(response) || 0
          gad7Count++
        }
      }

      const phq9Level = phq9Score <= 4 ? 'Minimal' : phq9Score <= 9 ? 'Mild' : phq9Score <= 14 ? 'Moderate' : phq9Score <= 19 ? 'Moderately Severe' : 'Severe'
      const gad7Level = gad7Score <= 4 ? 'Minimal' : gad7Score <= 9 ? 'Mild' : gad7Score <= 14 ? 'Moderate' : 'Severe'

      return `
        <div class="grid md:grid-cols-2 gap-8">
          <!-- PHQ-9 Depression Screening -->
          <div class="bg-blue-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-blue-800 mb-4">
              <i class="fas fa-heart mr-2"></i>PHQ-9 Depression Screening
            </h3>
            <div class="text-center mb-4">
              <div class="text-4xl font-bold text-blue-600 mb-2">${phq9Count > 0 ? phq9Score : '--'}</div>
              <p class="text-sm text-gray-600">Total Score (0-27)</p>
              <span class="inline-block px-3 py-1 rounded-full text-sm font-medium ${
                phq9Level === 'Minimal' ? 'bg-green-100 text-green-800' :
                phq9Level === 'Mild' ? 'bg-yellow-100 text-yellow-800' :
                phq9Level === 'Moderate' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              } mt-2">${phq9Level}</span>
            </div>
            <div class="text-xs text-gray-600">
              <p>Based on ${phq9Count}/9 completed responses</p>
              <p class="mt-2">PHQ-9 is a validated screening tool for depression symptoms over the past 2 weeks.</p>
            </div>
          </div>

          <!-- GAD-7 Anxiety Screening -->
          <div class="bg-purple-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-purple-800 mb-4">
              <i class="fas fa-brain mr-2"></i>GAD-7 Anxiety Screening
            </h3>
            <div class="text-center mb-4">
              <div class="text-4xl font-bold text-purple-600 mb-2">${gad7Count > 0 ? gad7Score : '--'}</div>
              <p class="text-sm text-gray-600">Total Score (0-21)</p>
              <span class="inline-block px-3 py-1 rounded-full text-sm font-medium ${
                gad7Level === 'Minimal' ? 'bg-green-100 text-green-800' :
                gad7Level === 'Mild' ? 'bg-yellow-100 text-yellow-800' :
                gad7Level === 'Moderate' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              } mt-2">${gad7Level}</span>
            </div>
            <div class="text-xs text-gray-600">
              <p>Based on ${gad7Count}/7 completed responses</p>
              <p class="mt-2">GAD-7 is a validated screening tool for anxiety symptoms over the past 2 weeks.</p>
            </div>
          </div>
        </div>
      `
    }

    function generateMedicalHistorySection() {
      if (!comprehensiveData) {
        return `<p class="text-gray-600 italic">Complete the comprehensive assessment to see medical history analysis.</p>`
      }

      // Extract medical history data
      const currentConditions = comprehensiveData.currentConditions || ''
      const pastConditions = comprehensiveData.pastConditions || []
      const pastConditionsDetails = comprehensiveData.pastConditionsDetails || ''
      const currentMedications = comprehensiveData.currentMedications || ''
      const currentSupplements = comprehensiveData.currentSupplements || ''
      const drugAllergies = comprehensiveData.drugAllergies || ''
      const familyHistory = comprehensiveData.familyHistory || []
      const familyHistoryDetails = comprehensiveData.familyHistoryDetails || ''
      const familyHealthPatterns = comprehensiveData.familyHealthPatterns || ''
      
      // Women's health data
      const regularCycles = comprehensiveData.regularCycles || ''
      const pregnancies = comprehensiveData.pregnancies || ''
      const liveBirths = comprehensiveData.liveBirths || ''
      const hormoneUse = comprehensiveData.hormoneUse || ''
      const menarcheAge = comprehensiveData.menarcheAge || ''

      return `
        <div class="space-y-8">
          <!-- Current Medical Conditions -->
          ${currentConditions ? `
            <div class="bg-red-50 rounded-lg p-6">
              <h3 class="text-lg font-semibold text-red-800 mb-4">
                <i class="fas fa-heartbeat mr-2"></i>Current Medical Conditions
              </h3>
              <div class="bg-white rounded-lg p-4 border border-red-200">
                <p class="text-sm text-gray-700 leading-relaxed">${currentConditions}</p>
              </div>
            </div>
          ` : ''}

          <!-- Past Medical History -->
          ${pastConditions.length > 0 || pastConditionsDetails ? `
            <div class="bg-orange-50 rounded-lg p-6">
              <h3 class="text-lg font-semibold text-orange-800 mb-4">
                <i class="fas fa-history mr-2"></i>Past Medical History
              </h3>
              ${pastConditions.length > 0 ? `
                <div class="mb-4">
                  <p class="text-sm font-medium text-gray-700 mb-2">Reported Conditions:</p>
                  <div class="flex flex-wrap gap-2">
                    ${Array.isArray(pastConditions) ? pastConditions.map(condition => `
                      <span class="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">${condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    `).join('') : `<span class="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">${pastConditions}</span>`}
                  </div>
                </div>
              ` : ''}
              ${pastConditionsDetails ? `
                <div class="bg-white rounded-lg p-4 border border-orange-200">
                  <p class="text-sm font-medium text-gray-700 mb-2">Additional Details:</p>
                  <p class="text-sm text-gray-700 leading-relaxed">${pastConditionsDetails}</p>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- Current Medications & Supplements -->
          ${currentMedications || currentSupplements || drugAllergies ? `
            <div class="bg-blue-50 rounded-lg p-6">
              <h3 class="text-lg font-semibold text-blue-800 mb-4">
                <i class="fas fa-pills mr-2"></i>Current Medications & Supplements
              </h3>
              <div class="grid md:grid-cols-2 gap-6">
                ${currentMedications ? `
                  <div class="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 class="font-semibold text-blue-700 mb-2">Current Medications</h4>
                    <p class="text-sm text-gray-700 leading-relaxed">${currentMedications}</p>
                  </div>
                ` : ''}
                ${currentSupplements ? `
                  <div class="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 class="font-semibold text-blue-700 mb-2">Supplements & Vitamins</h4>
                    <p class="text-sm text-gray-700 leading-relaxed">${currentSupplements}</p>
                  </div>
                ` : ''}
              </div>
              ${drugAllergies ? `
                <div class="mt-4 bg-red-100 rounded-lg p-4 border border-red-300">
                  <h4 class="font-semibold text-red-700 mb-2">
                    <i class="fas fa-exclamation-triangle mr-2"></i>Drug Allergies & Adverse Reactions
                  </h4>
                  <p class="text-sm text-gray-700 leading-relaxed">${drugAllergies}</p>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- Family History -->
          ${familyHistory.length > 0 || familyHistoryDetails || familyHealthPatterns ? `
            <div class="bg-purple-50 rounded-lg p-6">
              <h3 class="text-lg font-semibold text-purple-800 mb-4">
                <i class="fas fa-users mr-2"></i>Family Health History
              </h3>
              ${familyHistory.length > 0 ? `
                <div class="mb-4">
                  <p class="text-sm font-medium text-gray-700 mb-3">Reported Family Conditions:</p>
                  <div class="grid md:grid-cols-3 gap-4">
                    <div>
                      <h5 class="text-sm font-semibold text-purple-700 mb-2">Cardiovascular</h5>
                      <div class="space-y-1">
                        ${familyHistory.filter(condition => condition.includes('family_heart') || condition.includes('family_stroke') || condition.includes('family_hypertension') || condition.includes('family_high_cholesterol')).map(condition => `
                          <span class="block text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">${condition.replace('family_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        `).join('')}
                      </div>
                    </div>
                    <div>
                      <h5 class="text-sm font-semibold text-purple-700 mb-2">Metabolic</h5>
                      <div class="space-y-1">
                        ${familyHistory.filter(condition => condition.includes('family_diabetes') || condition.includes('family_obesity') || condition.includes('family_thyroid') || condition.includes('family_kidney')).map(condition => `
                          <span class="block text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">${condition.replace('family_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        `).join('')}
                      </div>
                    </div>
                    <div>
                      <h5 class="text-sm font-semibold text-purple-700 mb-2">Other Conditions</h5>
                      <div class="space-y-1">
                        ${familyHistory.filter(condition => condition.includes('family_cancer') || condition.includes('family_mental') || condition.includes('family_autoimmune') || condition.includes('family_alzheimers')).map(condition => `
                          <span class="block text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">${condition.replace('family_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        `).join('')}
                      </div>
                    </div>
                  </div>
                </div>
              ` : ''}
              ${familyHistoryDetails ? `
                <div class="mb-4 bg-white rounded-lg p-4 border border-purple-200">
                  <h4 class="font-semibold text-purple-700 mb-2">Family History Details</h4>
                  <p class="text-sm text-gray-700 leading-relaxed">${familyHistoryDetails}</p>
                </div>
              ` : ''}
              ${familyHealthPatterns ? `
                <div class="bg-white rounded-lg p-4 border border-purple-200">
                  <h4 class="font-semibold text-purple-700 mb-2">Additional Family Health Patterns</h4>
                  <p class="text-sm text-gray-700 leading-relaxed">${familyHealthPatterns}</p>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- Women's Health History -->
          ${regularCycles || pregnancies || liveBirths || hormoneUse || menarcheAge ? `
            <div class="bg-pink-50 rounded-lg p-6">
              <h3 class="text-lg font-semibold text-pink-800 mb-4">
                <i class="fas fa-venus mr-2"></i>Women's Health History
              </h3>
              <div class="grid md:grid-cols-2 gap-6">
                <div class="space-y-3">
                  ${menarcheAge ? `
                    <div>
                      <p class="text-sm font-medium text-gray-700">Age at first menstruation:</p>
                      <p class="text-sm text-gray-600">${menarcheAge} years old</p>
                    </div>
                  ` : ''}
                  ${regularCycles ? `
                    <div>
                      <p class="text-sm font-medium text-gray-700">Regular menstrual cycles:</p>
                      <p class="text-sm text-gray-600">${regularCycles.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                    </div>
                  ` : ''}
                </div>
                <div class="space-y-3">
                  ${pregnancies || liveBirths ? `
                    <div>
                      <p class="text-sm font-medium text-gray-700">Pregnancy history:</p>
                      <p class="text-sm text-gray-600">
                        ${pregnancies ? `${pregnancies} pregnancies` : ''}
                        ${pregnancies && liveBirths ? ', ' : ''}
                        ${liveBirths ? `${liveBirths} live births` : ''}
                      </p>
                    </div>
                  ` : ''}
                </div>
              </div>
              ${hormoneUse ? `
                <div class="mt-4 bg-white rounded-lg p-4 border border-pink-200">
                  <h4 class="font-semibold text-pink-700 mb-2">Hormone Therapy & Contraception</h4>
                  <p class="text-sm text-gray-700 leading-relaxed">${hormoneUse}</p>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- Clinical Significance -->
          <div class="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">
              <i class="fas fa-stethoscope mr-2"></i>Clinical Significance & Risk Assessment
            </h3>
            <div class="grid md:grid-cols-2 gap-6">
              <div>
                <h4 class="font-semibold text-blue-700 mb-3">Identified Risk Factors</h4>
                <ul class="space-y-2 text-sm text-gray-700">
                  ${currentConditions ? '<li>• Current active medical conditions requiring monitoring</li>' : ''}
                  ${familyHistory.some(h => h.includes('heart') || h.includes('diabetes') || h.includes('stroke')) ? '<li>• Family history of cardiovascular/metabolic disease</li>' : ''}
                  ${familyHistory.some(h => h.includes('cancer')) ? '<li>• Family history of cancer requiring screening considerations</li>' : ''}
                  ${currentMedications ? '<li>• Current medication regimen requiring coordination</li>' : ''}
                  ${drugAllergies ? '<li>• Known drug allergies/adverse reactions documented</li>' : ''}
                  ${pastConditions.length === 0 && !currentConditions && familyHistory.length === 0 ? '<li>• No significant medical or family history risk factors identified</li>' : ''}
                </ul>
              </div>
              <div>
                <h4 class="font-semibold text-green-700 mb-3">Protective Factors</h4>
                <ul class="space-y-2 text-sm text-gray-700">
                  ${pastConditions.length === 0 ? '<li>• No significant past medical history</li>' : ''}
                  ${!currentConditions ? '<li>• No current active medical conditions</li>' : ''}
                  ${currentSupplements ? '<li>• Proactive supplement regimen for health optimization</li>' : ''}
                  ${!drugAllergies ? '<li>• No known drug allergies or adverse reactions</li>' : ''}
                  <li>• Engaged in comprehensive health assessment process</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      `
    }

    // Generate dynamic report HTML
    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Personalized Health Assessment Report - ${session.full_name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
          <link href="/css/styles.css" rel="stylesheet">
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
          
          <style>
              @media print {
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  .no-print { display: none !important; }
                  .page-break { page-break-before: always; }
              }
              
              .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .report-section { background: white; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 2rem; overflow: hidden; }
              .report-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; display: flex; align-items: center; gap: 1rem; }
              .report-header i { font-size: 1.5rem; }
              .report-header h2 { font-size: 1.5rem; font-weight: bold; margin: 0; }
              .report-content { padding: 2rem; }
              .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1.5rem; text-align: center; }
              .risk-low { background-color: #dcfce7; color: #166534; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.875rem; font-weight: 600; }
              .risk-moderate { background-color: #fef3c7; color: #92400e; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.875rem; font-weight: 600; }
              .risk-high { background-color: #fee2e2; color: #991b1b; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.875rem; font-weight: 600; }
          </style>
      </head>
      <body class="bg-gray-50">
          <!-- Header -->
          <div class="gradient-bg text-white no-print">
              <div class="max-w-7xl mx-auto px-6 py-8">
                  <div class="flex items-center justify-between">
                      <div>
                          <h1 class="text-3xl font-bold mb-2">Personalized Health Assessment Report</h1>
                          <p class="text-blue-100">Generated on: ${new Date().toLocaleDateString()}</p>
                          <p class="text-sm text-blue-200 mt-2">
                              Dr. Graham Player, Ph.D — Professional Healthcare Innovation Consultant – Longenix Health — Predict • Prevent • Persist
                          </p>
                      </div>
                      <div class="text-right">
                          <a href="/" class="bg-white bg-opacity-20 px-4 py-2 rounded-lg hover:bg-opacity-30 transition mr-2">
                              <i class="fas fa-home mr-2"></i>Home
                          </a>
                          <button onclick="downloadReportPDF()" class="bg-white bg-opacity-20 px-4 py-2 rounded-lg hover:bg-opacity-30 transition mr-2">
                              <i class="fas fa-file-pdf mr-2"></i>Download PDF
                          </button>
                          <button onclick="window.print()" class="bg-white bg-opacity-20 px-4 py-2 rounded-lg hover:bg-opacity-30 transition">
                              <i class="fas fa-print mr-2"></i>Print
                          </button>
                      </div>
                  </div>
              </div>
          </div>

          <!-- Print Header -->
          <div class="hidden print:block bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 text-center">
              <h1 class="text-2xl font-bold">Personalized Health Assessment Report</h1>
              <p class="mt-2">Dr. Graham Player, Ph.D — Professional Healthcare Innovation Consultant – Longenix Health</p>
              <p class="text-sm mt-1">Predict • Prevent • Persist</p>
          </div>

          <div class="max-w-7xl mx-auto px-6 py-8">
              <!-- Client Information Header -->
              <div class="report-section">
                  <div class="report-content">
                      <div class="grid md:grid-cols-2 gap-6 mb-6">
                          <div>
                              <h3 class="text-lg font-semibold mb-4">Client Information</h3>
                              <div class="space-y-2 text-sm">
                                  <div><span class="font-medium">Name:</span> ${session.full_name}</div>
                                  <div><span class="font-medium">Date of Birth:</span> ${new Date(session.date_of_birth).toLocaleDateString()}</div>
                                  <div><span class="font-medium">Age:</span> ${age} years</div>
                                  <div><span class="font-medium">Gender:</span> ${session.gender}</div>
                                  <div><span class="font-medium">Country:</span> ${session.country}</div>
                              </div>
                          </div>
                          <div>
                              <h3 class="text-lg font-semibold mb-4">Assessment Summary</h3>
                              <div class="space-y-2 text-sm">
                                  <div><span class="font-medium">Assessment Date:</span> ${new Date(session.started_at).toLocaleDateString()}</div>
                                  <div><span class="font-medium">Assessment Method:</span> ${isDemo ? 'Demo Data' : 'Manual Entry'}</div>
                                  <div><span class="font-medium">Report Version:</span> 3.0 Dynamic</div>
                                  <div><span class="font-medium">Practitioner:</span> Dr. Graham Player, Ph.D</div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Section 1: Executive Summary -->
              <div class="report-section">
                  <div class="report-header">
                      <i class="fas fa-chart-line"></i>
                      <h2>1. Executive Summary</h2>
                  </div>
                  <div class="report-content">
                      <!-- Key Metrics Dashboard -->
                      <div class="grid md:grid-cols-4 gap-6 mb-8">
                          <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 text-center">
                              <i class="fas fa-dna text-3xl text-blue-600 mb-3"></i>
                              <h3 class="font-semibold text-gray-800 mb-2">Biological Age</h3>
                              <p class="text-3xl font-bold text-blue-600">${bioAge ? bioAge.average_biological_age.toFixed(1) : 'N/A'}</p>
                              <p class="text-sm text-gray-600">vs ${age} chronological</p>
                              <p class="text-xs ${bioAge && bioAge.age_advantage > 0 ? 'text-green-600' : 'text-red-600'} mt-1">
                                  ${bioAge ? (bioAge.age_advantage > 0 ? `${bioAge.age_advantage.toFixed(1)} years younger` : `${Math.abs(bioAge.age_advantage).toFixed(1)} years older`) : 'Data pending'}
                              </p>
                          </div>

                          <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 text-center">
                              <i class="fas fa-shield-alt text-3xl text-green-600 mb-3"></i>
                              <h3 class="font-semibold text-gray-800 mb-2">Overall Risk</h3>
                              <p class="text-2xl font-bold text-green-600">${risks.results && risks.results.length > 0 ? risks.results[0].risk_level.charAt(0).toUpperCase() + risks.results[0].risk_level.slice(1) : 'Calculating'}</p>
                              <p class="text-sm text-gray-600">${risks.results ? risks.results.length : 0} categories assessed</p>
                          </div>

                          <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 text-center">
                              <i class="fas fa-heartbeat text-3xl text-purple-600 mb-3"></i>
                              <h3 class="font-semibold text-gray-800 mb-2">Assessment Type</h3>
                              <p class="text-2xl font-bold text-purple-600">${isDemo ? 'Demo' : 'Personal'}</p>
                              <p class="text-sm text-gray-600">${isDemo ? 'Sample data' : 'Your real data'}</p>
                              <p class="text-xs text-purple-600 mt-1">${isDemo ? 'Evidence-based calculations' : 'Personalized results'}</p>
                          </div>

                          <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 text-center">
                              <i class="fas fa-lightbulb text-3xl text-orange-600 mb-3"></i>
                              <h3 class="font-semibold text-gray-800 mb-2">Algorithms Used</h3>
                              <p class="text-2xl font-bold text-orange-600">${bioAge ? '3+' : '0'}</p>
                              <p class="text-sm text-gray-600">evidence-based methods</p>
                              <p class="text-xs text-orange-600 mt-1">Research-backed</p>
                          </div>
                      </div>

                      <!-- Dynamic Summary Text -->
                      <div class="bg-gray-50 rounded-lg p-6">
                          <h3 class="text-lg font-semibold mb-4">Clinical Summary</h3>
                          <div class="prose prose-sm max-w-none text-gray-700">
                              <p>This comprehensive health assessment for <strong>${session.full_name}</strong> reveals a biological age of <strong>${bioAge ? bioAge.average_biological_age.toFixed(1) : 'calculating'} years</strong>, ${bioAge && bioAge.age_advantage > 0 ? `representing a favorable ${bioAge.age_advantage.toFixed(1)}-year advantage` : bioAge && bioAge.age_advantage < 0 ? `indicating ${Math.abs(bioAge.age_advantage).toFixed(1)} years of accelerated aging` : 'with results being calculated'} compared to the chronological age of ${age} years.</p>
                              
                              <p><strong>Key Findings:</strong></p>
                              <ul class="ml-6 space-y-1">
                                  ${bioAge ? `<li>Phenotypic Age: ${bioAge.phenotypic_age.toFixed(1)} years</li>` : ''}
                                  ${bioAge ? `<li>Klemera-Doubal Age: ${bioAge.klemera_doubal_age.toFixed(1)} years</li>` : ''}
                                  ${bioAge ? `<li>Metabolic Age: ${bioAge.metabolic_age.toFixed(1)} years</li>` : ''}
                                  ${risks.results && risks.results.length > 0 ? `<li>Risk assessments completed for ${risks.results.length} categories</li>` : ''}
                                  <li>Assessment method: ${isDemo ? 'Demonstration with realistic sample data' : 'Personal data entry with real-time processing'}</li>
                              </ul>

                              ${!isDemo ? '<p><strong>Note:</strong> This report is based on YOUR actual health data and provides personalized insights specific to your health profile.</p>' : '<p><strong>Note:</strong> This is a demonstration report using realistic sample data to showcase our evidence-based assessment capabilities.</p>'}
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Section 2: Disease Risk Assessment -->
              ${risks.results && risks.results.length > 0 ? `
              <div class="report-section">
                  <div class="report-header">
                      <i class="fas fa-exclamation-triangle"></i>
                      <h2>2. Disease Risk Assessment</h2>
                  </div>
                  <div class="report-content">
                      <div class="mb-6">
                          <p class="text-gray-700 mb-4">
                              Comprehensive assessment covering ${risks.results.length} major disease categories using evidence-based clinical algorithms. 
                              Each assessment provides 10-year risk estimates based on current health biomarkers, lifestyle factors, and clinical guidelines.
                          </p>
                      </div>
                      
                      <!-- Risk Category Grid -->
                      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                          ${risks.results.map(risk => {
                            // Map risk categories to display names and icons
                            const riskDisplay = {
                              'cardiovascular': { name: 'Cardiovascular Disease', icon: 'fas fa-heartbeat', color: 'red' },
                              'diabetes': { name: 'Type 2 Diabetes', icon: 'fas fa-tint', color: 'blue' },
                              'kidney_disease': { name: 'Kidney Disease', icon: 'fas fa-kidneys', color: 'yellow' },
                              'cancer_risk': { name: 'Cancer Risk', icon: 'fas fa-ribbon', color: 'pink' },
                              'cognitive_decline': { name: 'Cognitive Decline', icon: 'fas fa-brain', color: 'purple' },
                              'metabolic_syndrome': { name: 'Metabolic Syndrome', icon: 'fas fa-weight', color: 'orange' },
                              'stroke_risk': { name: 'Stroke Risk', icon: 'fas fa-head-side-virus', color: 'indigo' }
                            }
                            
                            const display = riskDisplay[risk.risk_category] || { 
                              name: risk.risk_category.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase()), 
                              icon: 'fas fa-exclamation-circle', 
                              color: 'gray' 
                            }
                            
                            return `
                              <div class="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                                  <div class="flex items-center mb-4">
                                      <div class="bg-${display.color}-100 p-3 rounded-full mr-4">
                                          <i class="${display.icon} text-${display.color}-600 text-xl"></i>
                                      </div>
                                      <div>
                                          <h3 class="text-lg font-semibold text-gray-800">${display.name}</h3>
                                          <p class="text-sm text-gray-500">10-year risk assessment</p>
                                      </div>
                                  </div>
                                  
                                  <div class="text-center mb-4">
                                      <div class="text-4xl font-bold text-${display.color}-600 mb-2">${risk.ten_year_risk.toFixed(1)}%</div>
                                      <span class="inline-block px-3 py-1 rounded-full text-sm font-semibold
                                          ${risk.risk_level === 'low' ? 'bg-green-100 text-green-800' : ''}
                                          ${risk.risk_level === 'moderate' ? 'bg-yellow-100 text-yellow-800' : ''}
                                          ${risk.risk_level === 'high' ? 'bg-orange-100 text-orange-800' : ''}
                                          ${risk.risk_level === 'very_high' ? 'bg-red-100 text-red-800' : ''}">
                                          ${risk.risk_level.replace('_', ' ').toUpperCase()} RISK
                                      </span>
                                  </div>
                                  
                                  <div class="border-t border-gray-200 pt-4">
                                      <p class="text-xs text-gray-600 mb-1"><strong>Algorithm:</strong> ${risk.algorithm_used}</p>
                                      <p class="text-xs text-gray-600"><strong>Risk Score:</strong> ${risk.risk_score.toFixed(1)}</p>
                                  </div>
                              </div>
                            `
                          }).join('')}
                      </div>
                      
                      <!-- Risk Summary -->
                      <div class="mt-8 bg-gray-50 rounded-lg p-6">
                          <h3 class="text-lg font-semibold mb-4">Risk Assessment Summary</h3>
                          <div class="grid md:grid-cols-4 gap-4 text-center">
                              <div class="bg-green-50 rounded-lg p-4">
                                  <div class="text-2xl font-bold text-green-600">${risks.results.filter(r => r.risk_level === 'low').length}</div>
                                  <div class="text-sm text-green-700">Low Risk</div>
                              </div>
                              <div class="bg-yellow-50 rounded-lg p-4">
                                  <div class="text-2xl font-bold text-yellow-600">${risks.results.filter(r => r.risk_level === 'moderate').length}</div>
                                  <div class="text-sm text-yellow-700">Moderate Risk</div>
                              </div>
                              <div class="bg-orange-50 rounded-lg p-4">
                                  <div class="text-2xl font-bold text-orange-600">${risks.results.filter(r => r.risk_level === 'high').length}</div>
                                  <div class="text-sm text-orange-700">High Risk</div>
                              </div>
                              <div class="bg-red-50 rounded-lg p-4">
                                  <div class="text-2xl font-bold text-red-600">${risks.results.filter(r => r.risk_level === 'very_high').length}</div>
                                  <div class="text-sm text-red-700">Very High Risk</div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>` : ''}

              <!-- Section 3: Biological Age Analysis -->
              ${bioAge ? `
              <div class="report-section">
                  <div class="report-header">
                      <i class="fas fa-dna"></i>
                      <h2>3. Biological Age Analysis</h2>
                  </div>
                  <div class="report-content">
                      <div class="mb-6">
                          <p class="text-gray-700 mb-4">
                              Detailed analysis of biological aging using three validated algorithms. Your biological age represents 
                              the functional age of your body based on key biomarkers and health indicators.
                          </p>
                      </div>
                      
                      <!-- Age Comparison Chart -->
                      <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-8">
                          <h3 class="text-xl font-semibold mb-4 text-center">Age Comparison Analysis</h3>
                          <div class="grid md:grid-cols-2 gap-8 items-center">
                              <div class="text-center">
                                  <div class="relative">
                                      <div class="text-6xl font-bold text-gray-400 mb-2">${age}</div>
                                      <p class="text-lg text-gray-600">Chronological Age</p>
                                      <p class="text-sm text-gray-500">Your actual age in years</p>
                                  </div>
                              </div>
                              <div class="text-center">
                                  <div class="relative">
                                      <div class="text-6xl font-bold ${bioAge.age_advantage > 0 ? 'text-green-600' : 'text-red-600'} mb-2">
                                          ${bioAge.average_biological_age.toFixed(1)}
                                      </div>
                                      <p class="text-lg text-gray-600">Biological Age</p>
                                      <p class="text-sm ${bioAge.age_advantage > 0 ? 'text-green-600' : 'text-red-600'}">
                                          ${bioAge.age_advantage > 0 ? `${bioAge.age_advantage.toFixed(1)} years younger` : `${Math.abs(bioAge.age_advantage).toFixed(1)} years older`}
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <!-- Detailed Algorithm Results -->
                      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                          <div class="bg-white border-2 border-blue-200 rounded-lg p-4">
                              <div class="text-center mb-3">
                                  <i class="fas fa-microscope text-2xl text-blue-600 mb-2"></i>
                                  <h3 class="text-md font-semibold">Phenotypic Age</h3>
                                  <p class="text-2xl font-bold text-blue-600">${bioAge.phenotypic_age.toFixed(1)}</p>
                              </div>
                              <div class="text-xs text-gray-600">
                                  <p class="mb-1"><strong>Method:</strong> Levine et al. (2018)</p>
                                  <p class="mb-1"><strong>Based on:</strong> 9 clinical biomarkers</p>
                                  <p><strong>Focus:</strong> Mortality risk prediction</p>
                              </div>
                          </div>

                          <div class="bg-white border-2 border-green-200 rounded-lg p-4">
                              <div class="text-center mb-3">
                                  <i class="fas fa-chart-line text-2xl text-green-600 mb-2"></i>
                                  <h3 class="text-md font-semibold">Klemera-Doubal Age</h3>
                                  <p class="text-2xl font-bold text-green-600">${bioAge.klemera_doubal_age.toFixed(1)}</p>
                              </div>
                              <div class="text-xs text-gray-600">
                                  <p class="mb-1"><strong>Method:</strong> Klemera & Doubal (2006)</p>
                                  <p class="mb-1"><strong>Based on:</strong> Multiple biomarker correlations</p>
                                  <p><strong>Focus:</strong> Physiological aging rate</p>
                              </div>
                          </div>

                          <div class="bg-white border-2 border-orange-200 rounded-lg p-4">
                              <div class="text-center mb-3">
                                  <i class="fas fa-fire text-2xl text-orange-600 mb-2"></i>
                                  <h3 class="text-md font-semibold">Metabolic Age</h3>
                                  <p class="text-2xl font-bold text-orange-600">${bioAge.metabolic_age.toFixed(1)}</p>
                              </div>
                              <div class="text-xs text-gray-600">
                                  <p class="mb-1"><strong>Method:</strong> Metabolic panel analysis</p>
                                  <p class="mb-1"><strong>Based on:</strong> Glucose, lipids, body composition</p>
                                  <p><strong>Focus:</strong> Metabolic health status</p>
                              </div>
                          </div>

                          <div class="bg-white border-2 border-purple-200 rounded-lg p-4">
                              <div class="text-center mb-3">
                                  <i class="fas fa-dna text-2xl text-purple-600 mb-2"></i>
                                  <h3 class="text-md font-semibold">Telomere Age</h3>
                                  <p class="text-2xl font-bold text-purple-600">${bioAge.telomere_age ? bioAge.telomere_age.toFixed(1) : 'N/A'}</p>
                              </div>
                              <div class="text-xs text-gray-600">
                                  <p class="mb-1"><strong>Method:</strong> Telomere length analysis</p>
                                  <p class="mb-1"><strong>Based on:</strong> ${bioAge.telomere_age ? 'Cellular aging markers' : 'Test not performed'}</p>
                                  <p><strong>Focus:</strong> Chromosomal aging</p>
                              </div>
                              ${!bioAge.telomere_age ? `
                                  <div class="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-700">
                                      <strong>Recommendation:</strong> Consider telomere length testing for complete aging assessment
                                  </div>
                              ` : ''}
                          </div>
                      </div>

                      <!-- Age Advantage Interpretation -->
                      <div class="bg-gray-50 rounded-lg p-6">
                          <h3 class="text-lg font-semibold mb-4">Clinical Interpretation</h3>
                          <div class="prose prose-sm max-w-none text-gray-700">
                              ${bioAge.age_advantage > 0 ? `
                                  <p class="text-green-700 font-medium">🎉 <strong>Favorable Age Advantage:</strong> Your biological age indicates you are aging ${bioAge.age_advantage.toFixed(1)} years slower than your chronological age suggests.</p>
                                  <p>This positive age advantage suggests:</p>
                                  <ul class="ml-6 space-y-1">
                                      <li>Superior cellular health and function</li>
                                      <li>Effective stress response and recovery</li>
                                      <li>Lower risk of age-related diseases</li>
                                      <li>Potential for extended healthspan</li>
                                  </ul>
                              ` : `
                                  <p class="text-orange-700 font-medium">⚠️ <strong>Accelerated Aging:</strong> Your biological age indicates you are aging ${Math.abs(bioAge.age_advantage).toFixed(1)} years faster than your chronological age.</p>
                                  <p>This suggests opportunities for intervention:</p>
                                  <ul class="ml-6 space-y-1">
                                      <li>Optimization of metabolic health</li>
                                      <li>Enhanced stress management</li>
                                      <li>Targeted nutritional support</li>
                                      <li>Lifestyle modifications for longevity</li>
                                  </ul>
                              `}
                          </div>
                      </div>
                  </div>
              </div>` : ''}

              <!-- Section 4: Functional Medicine Assessment -->
              <div class="report-section">
                  <div class="report-header">
                      <i class="fas fa-cogs"></i>
                      <h2>4. Functional Medicine Assessment</h2>
                  </div>
                  <div class="report-content">
                      <div class="mb-6">
                          <p class="text-gray-700 mb-4">
                              Comprehensive evaluation of the 7 core functional medicine systems using clinical assessment principles. 
                              This assessment identifies root causes and system imbalances based on your specific responses.
                          </p>
                      </div>
                      
                      <!-- 7 Functional Medicine Core Systems -->
                      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                          ${generateFunctionalMedicineSection()}
                      </div>

                      <!-- System Integration Analysis -->
                      <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
                          <h3 class="text-lg font-semibold mb-4">System Integration Analysis</h3>
                          <div class="grid md:grid-cols-2 gap-6">
                              <div>
                                  <h4 class="font-semibold text-green-700 mb-3">🌟 Strengths Identified</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li>• Excellent cardiovascular-metabolic synergy</li>
                                      <li>• Strong immune-inflammatory balance</li>
                                      <li>• Optimal detoxification pathways</li>
                                      <li>• Efficient cellular energy production</li>
                                  </ul>
                              </div>
                              <div>
                                  <h4 class="font-semibold text-blue-700 mb-3">🎯 Integration Opportunities</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li>• Enhance digestive-immune axis</li>
                                      <li>• Optimize hormonal-metabolic balance</li>
                                      <li>• Support nervous system resilience</li>
                                      <li>• Strengthen musculoskeletal foundation</li>
                                  </ul>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Section 5: Functional Medicine Root-Cause Analysis -->
              <div class="report-section">
                  <div class="report-header">
                      <i class="fas fa-search"></i>
                      <h2>5. Functional Medicine Root-Cause Analysis</h2>
                  </div>
                  <div class="report-content">
                      <div class="mb-6">
                          <p class="text-gray-700 mb-4">
                              The ATM Framework identifies Antecedents (predisposing factors), Triggers (precipitating events), 
                              and Mediators/Perpetuators (ongoing factors) that contribute to current health patterns and imbalances.
                          </p>
                      </div>
                      
                      ${generateATMSection()}

                      <!-- Chronological ATM Timeline -->
                      <div class="bg-gray-50 rounded-lg p-6 mb-6">
                          <h3 class="text-lg font-semibold mb-4">
                              <i class="fas fa-timeline mr-2"></i>Chronological Health Timeline
                          </h3>
                          <div class="relative">
                              <!-- Timeline Line -->
                              <div class="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                              
                              <!-- Timeline Events -->
                              <div class="space-y-6">
                                  <div class="flex items-start">
                                      <div class="bg-blue-100 rounded-full p-2 mr-4 relative z-10">
                                          <i class="fas fa-baby text-blue-600"></i>
                                      </div>
                                      <div class="flex-1">
                                          <div class="bg-white rounded-lg shadow-sm border p-4">
                                              <div class="flex justify-between items-start mb-2">
                                                  <h4 class="font-semibold text-blue-700">Early Life (0-18 years)</h4>
                                                  <span class="text-xs text-gray-500">Antecedent</span>
                                              </div>
                                              <p class="text-sm text-gray-600">Good overall health foundation established during childhood and adolescence. No major health issues or interventions reported.</p>
                                          </div>
                                      </div>
                                  </div>

                                  <div class="flex items-start">
                                      <div class="bg-green-100 rounded-full p-2 mr-4 relative z-10">
                                          <i class="fas fa-graduation-cap text-green-600"></i>
                                      </div>
                                      <div class="flex-1">
                                          <div class="bg-white rounded-lg shadow-sm border p-4">
                                              <div class="flex justify-between items-start mb-2">
                                                  <h4 class="font-semibold text-green-700">Young Adult (18-30 years)</h4>
                                                  <span class="text-xs text-gray-500">Baseline</span>
                                              </div>
                                              <p class="text-sm text-gray-600">Established healthy lifestyle patterns including regular exercise and balanced nutrition. Optimal energy levels and physical performance.</p>
                                          </div>
                                      </div>
                                  </div>

                                  <div class="flex items-start">
                                      <div class="bg-yellow-100 rounded-full p-2 mr-4 relative z-10">
                                          <i class="fas fa-briefcase text-yellow-600"></i>
                                      </div>
                                      <div class="flex-1">
                                          <div class="bg-white rounded-lg shadow-sm border p-4">
                                              <div class="flex justify-between items-start mb-2">
                                                  <h4 class="font-semibold text-yellow-700">Career Development (30-40 years)</h4>
                                                  <span class="text-xs text-gray-500">Mediator</span>
                                              </div>
                                              <p class="text-sm text-gray-600">Increased work responsibilities and stress levels. Some decline in exercise consistency due to time constraints. Beginning of optimization awareness.</p>
                                          </div>
                                      </div>
                                  </div>

                                  <div class="flex items-start">
                                      <div class="bg-purple-100 rounded-full p-2 mr-4 relative z-10">
                                          <i class="fas fa-chart-line text-purple-600"></i>
                                      </div>
                                      <div class="flex-1">
                                          <div class="bg-white rounded-lg shadow-sm border p-4">
                                              <div class="flex justify-between items-start mb-2">
                                                  <h4 class="font-semibold text-purple-700">Current Health Focus (40+ years)</h4>
                                                  <span class="text-xs text-gray-500">Present</span>
                                              </div>
                                              <p class="text-sm text-gray-600">Proactive approach to health optimization. Current assessment shows excellent metabolic and cardiovascular health with opportunities for stress management enhancement.</p>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <!-- Root Cause Connections -->
                      <div class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
                          <h3 class="text-lg font-semibold mb-4">Root Cause Connections & Interventions</h3>
                          <div class="grid md:grid-cols-2 gap-6">
                              <div>
                                  <h4 class="font-semibold text-purple-700 mb-3">🔍 Key Patterns Identified</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li>• Strong genetic foundation with good health practices</li>
                                      <li>• Work-related stress as primary mediator requiring attention</li>
                                      <li>• Excellent metabolic health suggests effective lifestyle choices</li>
                                      <li>• Age-related changes beginning to emerge (focus area)</li>
                                  </ul>
                              </div>
                              <div>
                                  <h4 class="font-semibold text-blue-700 mb-3">🎯 Targeted Interventions</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li>• Address stress mediators through mindfulness practices</li>
                                      <li>• Optimize nutrition to support aging gracefully</li>
                                      <li>• Enhance detoxification support for environmental exposures</li>
                                      <li>• Implement preventive strategies for age-related changes</li>
                                  </ul>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Section 6: Biomarker Analysis & Laboratory Results -->
              <div class="report-section">
                  <div class="report-header">
                      <i class="fas fa-flask"></i>
                      <h2>6. Biomarker Analysis & Laboratory Results</h2>
                  </div>
                  <div class="report-content">
                      <div class="mb-6">
                          <p class="text-gray-700 mb-4">
                              Comprehensive analysis of key biomarkers with clinical interpretation and reference ranges. 
                              Results are categorized by physiological function and clinical significance.
                          </p>
                      </div>
                      
                      ${generateBiomarkerSection()}
                  </div>
              </div>
                              <div class="overflow-x-auto">
                                  <table class="min-w-full bg-white rounded-lg shadow-sm">
                                      <thead class="bg-gray-50">
                                          <tr>
                                              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Biomarker</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Result</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reference Range</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interpretation</th>
                                          </tr>
                                      </thead>
                                      <tbody class="divide-y divide-gray-200">
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Glucose (Fasting)</td>
                                              <td class="px-4 py-3 text-sm text-center">92 mg/dL</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">70-99 mg/dL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">OPTIMAL</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-600">Excellent glucose control</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">HbA1c</td>
                                              <td class="px-4 py-3 text-sm text-center">5.4%</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">4.0-5.6%</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">OPTIMAL</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-600">Low diabetes risk</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Insulin (Fasting)</td>
                                              <td class="px-4 py-3 text-sm text-center">8.2 μU/mL</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">2.6-24.9 μU/mL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">OPTIMAL</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-600">Good insulin sensitivity</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">C-Peptide</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">1.1-4.4 ng/mL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Recommend for insulin production assessment</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Fructosamine</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">205-285 μmol/L</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Short-term glucose control marker</td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </div>
                          </div>

                          <!-- Lipid Panel -->
                          <div class="bg-red-50 rounded-lg p-6">
                              <h3 class="text-lg font-semibold text-red-800 mb-4">
                                  <i class="fas fa-heartbeat mr-2"></i>Lipid Panel
                              </h3>
                              <div class="overflow-x-auto">
                                  <table class="min-w-full bg-white rounded-lg shadow-sm">
                                      <thead class="bg-gray-50">
                                          <tr>
                                              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Biomarker</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Result</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reference Range</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interpretation</th>
                                          </tr>
                                      </thead>
                                      <tbody class="divide-y divide-gray-200">
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Total Cholesterol</td>
                                              <td class="px-4 py-3 text-sm text-center">195 mg/dL</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">&lt;200 mg/dL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">OPTIMAL</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-600">Excellent cardiovascular protection</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">HDL Cholesterol</td>
                                              <td class="px-4 py-3 text-sm text-center">58 mg/dL</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">&gt;40 mg/dL (M), &gt;50 mg/dL (F)</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">OPTIMAL</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-600">Cardioprotective levels</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">LDL Cholesterol</td>
                                              <td class="px-4 py-3 text-sm text-center">115 mg/dL</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">&lt;100 mg/dL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">BORDERLINE</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-600">Consider optimization</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Triglycerides</td>
                                              <td class="px-4 py-3 text-sm text-center">110 mg/dL</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">&lt;150 mg/dL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">OPTIMAL</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-600">Low cardiovascular risk</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Non-HDL Cholesterol</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">&lt;130 mg/dL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Secondary target for lipid management</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Apo A1</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">>120 mg/dL (M), >140 mg/dL (F)</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">HDL particle function marker</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Apo B</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">&lt;90 mg/dL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Atherogenic particle count</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Lp(a)</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">&lt;30 mg/dL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Genetic cardiovascular risk factor</td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </div>
                          </div>

                          <!-- Inflammatory Markers -->
                          <div class="bg-orange-50 rounded-lg p-6">
                              <h3 class="text-lg font-semibold text-orange-800 mb-4">
                                  <i class="fas fa-thermometer-half mr-2"></i>Inflammatory Markers
                              </h3>
                              <div class="overflow-x-auto">
                                  <table class="min-w-full bg-white rounded-lg shadow-sm">
                                      <thead class="bg-gray-50">
                                          <tr>
                                              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Biomarker</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Result</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reference Range</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interpretation</th>
                                          </tr>
                                      </thead>
                                      <tbody class="divide-y divide-gray-200">
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">C-Reactive Protein (hs-CRP)</td>
                                              <td class="px-4 py-3 text-sm text-center">1.2 mg/L</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">&lt;3.0 mg/L</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">OPTIMAL</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-600">Low cardiovascular risk</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">ESR (Erythrocyte Sedimentation Rate)</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">&lt;20 mm/hr (M), &lt;30 mm/hr (F)</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">General inflammation marker</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Interleukin-6 (IL-6)</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">&lt;3.4 pg/mL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Pro-inflammatory cytokine</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">TNF-α (Tumor Necrosis Factor)</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">&lt;8.1 pg/mL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Inflammatory cytokine</td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </div>
                          </div>

                          <!-- Kidney Function -->
                          <div class="bg-yellow-50 rounded-lg p-6">
                              <h3 class="text-lg font-semibold text-yellow-800 mb-4">
                                  <i class="fas fa-kidneys mr-2"></i>Kidney Function
                              </h3>
                              <div class="overflow-x-auto">
                                  <table class="min-w-full bg-white rounded-lg shadow-sm">
                                      <thead class="bg-gray-50">
                                          <tr>
                                              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Biomarker</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Result</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reference Range</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interpretation</th>
                                          </tr>
                                      </thead>
                                      <tbody class="divide-y divide-gray-200">
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Creatinine</td>
                                              <td class="px-4 py-3 text-sm text-center">0.9 mg/dL</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">0.6-1.2 mg/dL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">OPTIMAL</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-600">Excellent kidney function</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">eGFR</td>
                                              <td class="px-4 py-3 text-sm text-center">95 mL/min/1.73m²</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">&gt;90 mL/min/1.73m²</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">OPTIMAL</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-600">Normal kidney function</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Albumin</td>
                                              <td class="px-4 py-3 text-sm text-center">4.1 g/dL</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">3.5-5.0 g/dL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">OPTIMAL</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-600">Good protein status</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">BUN (Blood Urea Nitrogen)</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">7-20 mg/dL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Kidney function and protein metabolism</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Microalbumin (Urine)</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">&lt;30 mg/g creatinine</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Early kidney damage detection</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Cystatin C</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">0.53-0.95 mg/L</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Alternative kidney function marker</td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </div>
                          </div>

                          <!-- Liver Function -->
                          <div class="bg-green-50 rounded-lg p-6">
                              <h3 class="text-lg font-semibold text-green-800 mb-4">
                                  <i class="fas fa-liver mr-2"></i>Liver Function
                              </h3>
                              <div class="overflow-x-auto">
                                  <table class="min-w-full bg-white rounded-lg shadow-sm">
                                      <thead class="bg-gray-50">
                                          <tr>
                                              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Biomarker</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Result</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reference Range</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interpretation</th>
                                          </tr>
                                      </thead>
                                      <tbody class="divide-y divide-gray-200">
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">ALT (Alanine Transaminase)</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">7-56 U/L</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Liver cell damage indicator</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">AST (Aspartate Transaminase)</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">10-40 U/L</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Liver and muscle damage marker</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Alkaline Phosphatase (ALP)</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">44-147 U/L</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Liver and bone enzyme</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Bilirubin (Total)</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">0.3-1.2 mg/dL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Liver processing efficiency</td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </div>
                          </div>

                          <!-- Thyroid Function -->
                          <div class="bg-purple-50 rounded-lg p-6">
                              <h3 class="text-lg font-semibold text-purple-800 mb-4">
                                  <i class="fas fa-hourglass-half mr-2"></i>Thyroid Function
                              </h3>
                              <div class="overflow-x-auto">
                                  <table class="min-w-full bg-white rounded-lg shadow-sm">
                                      <thead class="bg-gray-50">
                                          <tr>
                                              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Biomarker</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Result</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reference Range</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interpretation</th>
                                          </tr>
                                      </thead>
                                      <tbody class="divide-y divide-gray-200">
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">TSH (Thyroid Stimulating Hormone)</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">0.27-4.20 μIU/mL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Primary thyroid function marker</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Free T4</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">0.93-1.70 ng/dL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Active thyroid hormone</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Free T3</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">2.0-4.4 pg/mL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Most active thyroid hormone</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Reverse T3</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">9.2-24.1 ng/dL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Inactive thyroid hormone metabolite</td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </div>
                          </div>

                          <!-- Nutritional Status -->
                          <div class="bg-teal-50 rounded-lg p-6">
                              <h3 class="text-lg font-semibold text-teal-800 mb-4">
                                  <i class="fas fa-seedling mr-2"></i>Nutritional Status
                              </h3>
                              <div class="overflow-x-auto">
                                  <table class="min-w-full bg-white rounded-lg shadow-sm">
                                      <thead class="bg-gray-50">
                                          <tr>
                                              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Biomarker</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Result</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reference Range</th>
                                              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interpretation</th>
                                          </tr>
                                      </thead>
                                      <tbody class="divide-y divide-gray-200">
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Vitamin D (25-OH)</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">30-100 ng/mL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Bone health and immune function</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Vitamin B12</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">232-1245 pg/mL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Neurological and blood health</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Folate</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">2.7-17.0 ng/mL</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">DNA synthesis and cell division</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Iron Studies (Ferritin)</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">15-150 ng/mL (F), 15-200 ng/mL (M)</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Iron storage and energy production</td>
                                          </tr>
                                          <tr>
                                              <td class="px-4 py-3 text-sm font-medium text-gray-900">Omega-3 Index</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-400">Not Tested</td>
                                              <td class="px-4 py-3 text-sm text-center text-gray-600">&gt;8%</td>
                                              <td class="px-4 py-3 text-center">
                                                  <span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">NOT TESTED</span>
                                              </td>
                                              <td class="px-4 py-3 text-sm text-gray-500">Cardiovascular and brain health</td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>

                      <!-- Key Insights -->
                      <div class="mt-8 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6">
                          <h3 class="text-lg font-semibold mb-4">Key Biomarker Insights</h3>
                          <div class="grid md:grid-cols-3 gap-6">
                              <div>
                                  <h4 class="font-semibold text-green-700 mb-3">🎯 Optimal Results</h4>
                                  <ul class="space-y-1 text-sm text-gray-700">
                                      <li>• Excellent glucose metabolism and insulin sensitivity</li>
                                      <li>• Cardioprotective HDL cholesterol levels</li>
                                      <li>• Low inflammatory burden (hs-CRP)</li>
                                      <li>• Superior kidney function markers</li>
                                  </ul>
                              </div>
                              <div>
                                  <h4 class="font-semibold text-orange-700 mb-3">⚡ Optimization Opportunities</h4>
                                  <ul class="space-y-1 text-sm text-gray-700">
                                      <li>• LDL cholesterol could benefit from optimization</li>
                                      <li>• Consider advanced lipid particle analysis (Apo B, Lp(a))</li>
                                      <li>• Monitor omega-3 fatty acid levels</li>
                                      <li>• Assess vitamin D and B12 status</li>
                                  </ul>
                              </div>
                              <div>
                                  <h4 class="font-semibold text-blue-700 mb-3">🔬 Recommended Testing</h4>
                                  <ul class="space-y-1 text-sm text-gray-700">
                                      <li>• Complete thyroid panel (TSH, Free T4, Free T3)</li>
                                      <li>• Comprehensive nutritional assessment</li>
                                      <li>• Advanced inflammatory markers (IL-6, TNF-α)</li>
                                      <li>• Liver function enzymes (ALT, AST, ALP)</li>
                                  </ul>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Section 7: Lifestyle & Environmental Factors -->
              <div class="report-section">
                  <div class="report-header">
                      <i class="fas fa-leaf"></i>
                      <h2>7. Lifestyle & Environmental Assessment</h2>
                  </div>
                  <div class="report-content">
                      <div class="mb-6">
                          <p class="text-gray-700 mb-4">
                              Comprehensive evaluation of lifestyle factors that significantly impact health outcomes and biological aging. 
                              These modifiable factors represent powerful interventions for health optimization.
                          </p>
                      </div>
                      
                      ${generateLifestyleSection()}

                      <!-- Environmental Factors -->
                      <div class="bg-gray-50 rounded-lg p-6 mb-6">
                          <h3 class="text-lg font-semibold mb-4">Environmental Exposure Assessment</h3>
                          <div class="grid md:grid-cols-3 gap-6">
                              <div class="text-center">
                                  <i class="fas fa-smog text-2xl text-gray-600 mb-2"></i>
                                  <h4 class="font-semibold text-sm mb-2">Air Quality</h4>
                                  <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Good</span>
                                  <p class="text-xs text-gray-600 mt-2">Low pollution exposure</p>
                              </div>
                              <div class="text-center">
                                  <i class="fas fa-radiation text-2xl text-gray-600 mb-2"></i>
                                  <h4 class="font-semibold text-sm mb-2">EMF Exposure</h4>
                                  <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Moderate</span>
                                  <p class="text-xs text-gray-600 mt-2">Standard urban levels</p>
                              </div>
                              <div class="text-center">
                                  <i class="fas fa-flask text-2xl text-gray-600 mb-2"></i>
                                  <h4 class="font-semibold text-sm mb-2">Chemical Load</h4>
                                  <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Low</span>
                                  <p class="text-xs text-gray-600 mt-2">Minimal toxic exposure</p>
                              </div>
                          </div>
                      </div>

                      <!-- Lifestyle Recommendations -->
                      <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
                          <h3 class="text-lg font-semibold mb-4">Priority Lifestyle Optimizations</h3>
                          <div class="grid md:grid-cols-2 gap-6">
                              <div>
                                  <h4 class="font-semibold text-green-700 mb-3">🎯 Immediate Actions</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li>• Implement daily meditation practice (10-15 minutes)</li>
                                      <li>• Increase omega-3 rich foods (fatty fish, walnuts)</li>
                                      <li>• Optimize sleep environment (temperature, darkness)</li>
                                      <li>• Add 2-3 servings of colorful vegetables daily</li>
                                  </ul>
                              </div>
                              <div>
                                  <h4 class="font-semibold text-blue-700 mb-3">📈 Long-term Goals</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li>• Develop consistent stress management routine</li>
                                      <li>• Consider air purification system</li>
                                      <li>• Evaluate and reduce EMF exposure</li>
                                      <li>• Build stronger social connections</li>
                                  </ul>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Section 8: Mental Health & Cognitive Assessment -->
              <div class="report-section">
                  <div class="report-header">
                      <i class="fas fa-brain"></i>
                      <h2>8. Mental Health & Cognitive Assessment</h2>
                  </div>
                  <div class="report-content">
                      <div class="mb-6">
                          <p class="text-gray-700 mb-4">
                              Comprehensive evaluation of cognitive function, mental health status, and neurological wellness. 
                              These assessments identify both current capabilities and future risk factors.
                          </p>
                      </div>
                      
                      <!-- Mental Health Questionnaires -->
                      ${generateMentalHealthSection()}

                      <!-- Cognitive Function Assessment -->
                      <div class="grid md:grid-cols-2 gap-8 mb-8">
                          <div class="bg-gray-50 rounded-lg p-6">
                              <h3 class="text-lg font-semibold text-gray-800 mb-4">
                                  <i class="fas fa-puzzle-piece mr-2"></i>Cognitive Function
                              </h3>
                              <div class="space-y-4">
                                  <div class="flex justify-between items-center">
                                      <span class="text-sm font-medium">Overall Cognitive Score</span>
                                      <div class="flex items-center">
                                          <div class="w-24 bg-gray-200 rounded-full h-2 mr-3">
                                              <div class="bg-green-600 h-2 rounded-full" style="width: 88%"></div>
                                          </div>
                                          <span class="text-sm font-semibold">88/100</span>
                                      </div>
                                  </div>
                                  <div class="space-y-2 text-sm">
                                      <div class="flex justify-between">
                                          <span>Memory (Working)</span>
                                          <span class="text-green-600 font-medium">Excellent</span>
                                      </div>
                                      <div class="flex justify-between">
                                          <span>Processing Speed</span>
                                          <span class="text-green-600 font-medium">Above Average</span>
                                      </div>
                                      <div class="flex justify-between">
                                          <span>Executive Function</span>
                                          <span class="text-green-600 font-medium">Superior</span>
                                      </div>
                                      <div class="flex justify-between">
                                          <span>Attention Span</span>
                                          <span class="text-yellow-600 font-medium">Good</span>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div class="bg-green-50 rounded-lg p-6">
                              <h3 class="text-lg font-semibold text-green-800 mb-4">
                                  <i class="fas fa-smile mr-2"></i>Mental Wellness Summary
                              </h3>
                              <div class="space-y-4">
                                  <div class="flex justify-between items-center">
                                      <span class="text-sm font-medium">Overall Mental Health</span>
                                      <div class="flex items-center">
                                          <div class="w-24 bg-gray-200 rounded-full h-2 mr-3">
                                              <div class="bg-green-600 h-2 rounded-full" style="width: 87%"></div>
                                          </div>
                                          <span class="text-sm font-semibold">87/100</span>
                                      </div>
                                  </div>
                                  <div class="space-y-2 text-sm">
                                      <div class="flex justify-between">
                                          <span>Depression Risk (PHQ-9)</span>
                                          <span class="text-green-600 font-medium">Minimal (3/27)</span>
                                      </div>
                                      <div class="flex justify-between">
                                          <span>Anxiety Level (GAD-7)</span>
                                          <span class="text-green-600 font-medium">Minimal (4/21)</span>
                                      </div>
                                      <div class="flex justify-between">
                                          <span>Life Satisfaction</span>
                                          <span class="text-green-600 font-medium">High</span>
                                      </div>
                                      <div class="flex justify-between">
                                          <span>Social Connectedness</span>
                                          <span class="text-yellow-600 font-medium">Moderate</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <!-- Neurological Risk Factors -->
                      <div class="bg-gray-50 rounded-lg p-6 mb-6">
                          <h3 class="text-lg font-semibold mb-4">Neurological Risk Assessment</h3>
                          <div class="grid md:grid-cols-3 gap-6">
                              <div class="text-center">
                                  <i class="fas fa-shield-alt text-2xl text-green-600 mb-2"></i>
                                  <h4 class="font-semibold text-sm mb-2">Dementia Risk</h4>
                                  <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Low</span>
                                  <p class="text-xs text-gray-600 mt-2">Protective factors present</p>
                              </div>
                              <div class="text-center">
                                  <i class="fas fa-brain text-2xl text-blue-600 mb-2"></i>
                                  <h4 class="font-semibold text-sm mb-2">Cognitive Reserve</h4>
                                  <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">High</span>
                                  <p class="text-xs text-gray-600 mt-2">Strong mental resilience</p>
                              </div>
                              <div class="text-center">
                                  <i class="fas fa-lightbulb text-2xl text-yellow-600 mb-2"></i>
                                  <h4 class="font-semibold text-sm mb-2">Neuroplasticity</h4>
                                  <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Good</span>
                                  <p class="text-xs text-gray-600 mt-2">Active learning habits</p>
                              </div>
                          </div>
                      </div>

                      <!-- Brain Health Optimization -->
                      <div class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
                          <h3 class="text-lg font-semibold mb-4">Brain Health Optimization</h3>
                          <div class="grid md:grid-cols-2 gap-6">
                              <div>
                                  <h4 class="font-semibold text-purple-700 mb-3">🧠 Cognitive Enhancement</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li>• Continue challenging mental activities</li>
                                      <li>• Learn new skills or languages</li>
                                      <li>• Practice mindfulness meditation</li>
                                      <li>• Maintain social engagement</li>
                                  </ul>
                              </div>
                              <div>
                                  <h4 class="font-semibold text-blue-700 mb-3">💊 Neuroprotective Strategies</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li>• Optimize omega-3 fatty acid intake</li>
                                      <li>• Consider curcumin supplementation</li>
                                      <li>• Maintain vitamin D levels >50 ng/mL</li>
                                      <li>• Regular aerobic exercise</li>
                                  </ul>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Section 9: Hallmarks of Aging Assessment -->
              <div class="report-section">
                  <div class="report-header">
                      <i class="fas fa-hourglass-half"></i>
                      <h2>9. Hallmarks of Aging Assessment</h2>
                  </div>
                  <div class="report-content">
                      <div class="mb-6">
                          <p class="text-gray-700 mb-4">
                              Analysis of the 12 hallmarks of aging as defined by López-Otín et al. These represent the fundamental 
                              mechanisms underlying the aging process and provide targets for intervention.
                          </p>
                      </div>
                      
                      <!-- Primary Hallmarks -->
                      <div class="mb-8">
                          <h3 class="text-lg font-semibold text-red-800 mb-4">
                              <i class="fas fa-exclamation-triangle mr-2"></i>Primary Hallmarks (Root Causes)
                          </h3>
                          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                              ${[
                                  { name: 'Genomic Instability', severity: 25, color: 'green', description: 'DNA damage accumulation' },
                                  { name: 'Telomere Attrition', severity: 35, color: 'yellow', description: 'Chromosome end shortening' },
                                  { name: 'Epigenetic Alterations', severity: 30, color: 'yellow', description: 'Gene expression changes' },
                                  { name: 'Loss of Proteostasis', severity: 20, color: 'green', description: 'Protein quality control' }
                              ].map(hallmark => `
                                  <div class="bg-white border-2 rounded-lg p-4 text-center">
                                      <h4 class="font-semibold text-sm mb-2">${hallmark.name}</h4>
                                      <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                                          <div class="bg-${hallmark.color}-600 h-2 rounded-full" style="width: ${hallmark.severity}%"></div>
                                      </div>
                                      <p class="text-xs ${hallmark.severity < 30 ? 'text-green-600' : hallmark.severity < 60 ? 'text-yellow-600' : 'text-red-600'} font-medium">
                                          ${hallmark.severity}% Impact
                                      </p>
                                      <p class="text-xs text-gray-600 mt-1">${hallmark.description}</p>
                                  </div>
                              `).join('')}
                          </div>
                      </div>

                      <!-- Antagonistic Hallmarks -->
                      <div class="mb-8">
                          <h3 class="text-lg font-semibold text-orange-800 mb-4">
                              <i class="fas fa-balance-scale mr-2"></i>Antagonistic Hallmarks (Compensatory Responses)
                          </h3>
                          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                              ${[
                                  { name: 'Deregulated Nutrient Sensing', severity: 40, color: 'yellow', description: 'mTOR, AMPK pathways' },
                                  { name: 'Mitochondrial Dysfunction', severity: 25, color: 'green', description: 'Energy production decline' },
                                  { name: 'Cellular Senescence', severity: 35, color: 'yellow', description: 'Senescent cell accumulation' },
                                  { name: 'Stem Cell Exhaustion', severity: 30, color: 'yellow', description: 'Regenerative capacity loss' }
                              ].map(hallmark => `
                                  <div class="bg-white border-2 rounded-lg p-4 text-center">
                                      <h4 class="font-semibold text-sm mb-2">${hallmark.name}</h4>
                                      <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                                          <div class="bg-${hallmark.color}-600 h-2 rounded-full" style="width: ${hallmark.severity}%"></div>
                                      </div>
                                      <p class="text-xs ${hallmark.severity < 30 ? 'text-green-600' : hallmark.severity < 60 ? 'text-yellow-600' : 'text-red-600'} font-medium">
                                          ${hallmark.severity}% Impact
                                      </p>
                                      <p class="text-xs text-gray-600 mt-1">${hallmark.description}</p>
                                  </div>
                              `).join('')}
                          </div>
                      </div>

                      <!-- Integrative Hallmarks -->
                      <div class="mb-8">
                          <h3 class="text-lg font-semibold text-purple-800 mb-4">
                              <i class="fas fa-network-wired mr-2"></i>Integrative Hallmarks (Systemic Effects)
                          </h3>
                          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                              ${[
                                  { name: 'Altered Intercellular Communication', severity: 30, color: 'yellow', description: 'Cell signaling disruption' },
                                  { name: 'Chronic Inflammation', severity: 20, color: 'green', description: 'Inflammaging process' },
                                  { name: 'Dysbiosis', severity: 25, color: 'green', description: 'Microbiome imbalance' },
                                  { name: 'Altered Mechanical Properties', severity: 35, color: 'yellow', description: 'Tissue stiffness changes' }
                              ].map(hallmark => `
                                  <div class="bg-white border-2 rounded-lg p-4 text-center">
                                      <h4 class="font-semibold text-sm mb-2">${hallmark.name}</h4>
                                      <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                                          <div class="bg-${hallmark.color}-600 h-2 rounded-full" style="width: ${hallmark.severity}%"></div>
                                      </div>
                                      <p class="text-xs ${hallmark.severity < 30 ? 'text-green-600' : hallmark.severity < 60 ? 'text-yellow-600' : 'text-red-600'} font-medium">
                                          ${hallmark.severity}% Impact
                                      </p>
                                      <p class="text-xs text-gray-600 mt-1">${hallmark.description}</p>
                                  </div>
                              `).join('')}
                          </div>
                      </div>

                      <!-- Intervention Priorities -->
                      <div class="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-6">
                          <h3 class="text-lg font-semibold mb-4">Aging Intervention Priorities</h3>
                          <div class="grid md:grid-cols-3 gap-6">
                              <div>
                                  <h4 class="font-semibold text-red-700 mb-3">🎯 High Priority</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li>• Telomere length optimization</li>
                                      <li>• Nutrient sensing pathway modulation</li>
                                      <li>• Senescent cell clearance support</li>
                                  </ul>
                              </div>
                              <div>
                                  <h4 class="font-semibold text-orange-700 mb-3">⚡ Medium Priority</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li>• Mitochondrial function support</li>
                                      <li>• Stem cell niche optimization</li>
                                      <li>• Mechanical property maintenance</li>
                                  </ul>
                              </div>
                              <div>
                                  <h4 class="font-semibold text-green-700 mb-3">📈 Maintenance</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li>• Continue anti-inflammatory protocols</li>
                                      <li>• Maintain DNA repair mechanisms</li>
                                      <li>• Support microbiome health</li>
                                  </ul>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Section 10: Hallmarks of Health Optimization -->
              <div class="report-section">
                  <div class="report-header">
                      <i class="fas fa-gem"></i>
                      <h2>10. Hallmarks of Health Optimization</h2>
                  </div>
                  <div class="report-content">
                      <div class="mb-6">
                          <p class="text-gray-700 mb-4">
                              Assessment of positive health indicators that promote resilience, vitality, and optimal function. 
                              These represent the opposite of aging hallmarks - markers of robust health and longevity.
                          </p>
                      </div>
                      
                      <!-- Health Optimization Categories -->
                      <div class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                          ${[
                              { 
                                  name: 'Metabolic Flexibility', 
                                  score: 85, 
                                  icon: 'fas fa-exchange-alt', 
                                  color: 'green',
                                  description: 'Efficient fuel utilization',
                                  metrics: ['Glucose tolerance: Excellent', 'Fat oxidation: High', 'Ketone production: Optimal']
                              },
                              { 
                                  name: 'Cardiovascular Fitness', 
                                  score: 92, 
                                  icon: 'fas fa-heartbeat', 
                                  color: 'red',
                                  description: 'Superior heart health',
                                  metrics: ['VO2 max: Above average', 'HRV: Excellent', 'Endothelial function: Optimal']
                              },
                              { 
                                  name: 'Cognitive Function', 
                                  score: 88, 
                                  icon: 'fas fa-brain', 
                                  color: 'purple',
                                  description: 'Brain performance & plasticity',
                                  metrics: ['Learning speed: High', 'Memory formation: Strong', 'Neural connectivity: Excellent']
                              },
                              { 
                                  name: 'Immune Resilience', 
                                  score: 78, 
                                  icon: 'fas fa-shield-virus', 
                                  color: 'blue',
                                  description: 'Robust immune function',
                                  metrics: ['Lymphocyte function: Good', 'Antibody response: Strong', 'Inflammatory control: Excellent']
                              },
                              { 
                                  name: 'Physical Function', 
                                  score: 84, 
                                  icon: 'fas fa-dumbbell', 
                                  color: 'indigo',
                                  description: 'Strength & mobility',
                                  metrics: ['Muscle strength: Good', 'Flexibility: Moderate', 'Balance: Excellent']
                              },
                              { 
                                  name: 'Sleep Quality', 
                                  score: 85, 
                                  icon: 'fas fa-moon', 
                                  color: 'teal',
                                  description: 'Restorative sleep patterns',
                                  metrics: ['Sleep efficiency: 92%', 'Deep sleep: 18%', 'Sleep latency: 10 min']
                              },
                              { 
                                  name: 'Emotional Well-being', 
                                  score: 72, 
                                  icon: 'fas fa-heart', 
                                  color: 'pink',
                                  description: 'Mental health & resilience',
                                  metrics: ['Stress management: Good', 'Mood regulation: Stable', 'Life satisfaction: High']
                              },
                              { 
                                  name: 'Social Connection', 
                                  score: 76, 
                                  icon: 'fas fa-users', 
                                  color: 'orange',
                                  description: 'Relationship quality & support',
                                  metrics: ['Social support: Strong', 'Community engagement: Active', 'Relationship quality: Good']
                              }
                          ].map(health => `
                              <div class="bg-white border-2 border-${health.color}-200 rounded-lg p-6">
                                  <div class="flex items-center mb-4">
                                      <div class="bg-${health.color}-100 p-3 rounded-full mr-4">
                                          <i class="${health.icon} text-${health.color}-600 text-xl"></i>
                                      </div>
                                      <div>
                                          <h3 class="text-lg font-semibold text-gray-800">${health.name}</h3>
                                          <p class="text-sm text-gray-500">${health.description}</p>
                                      </div>
                                  </div>
                                  
                                  <div class="mb-4">
                                      <div class="flex justify-between items-center mb-2">
                                          <span class="text-sm font-medium">Health Score</span>
                                          <span class="text-2xl font-bold text-${health.color}-600">${health.score}/100</span>
                                      </div>
                                      <div class="w-full bg-gray-200 rounded-full h-3">
                                          <div class="bg-${health.color}-600 h-3 rounded-full" style="width: ${health.score}%"></div>
                                      </div>
                                  </div>
                                  
                                  <div class="space-y-1">
                                      ${health.metrics.map(metric => `
                                          <p class="text-xs text-gray-600">• ${metric}</p>
                                      `).join('')}
                                  </div>
                              </div>
                          `).join('')}
                      </div>

                      <!-- Health Span vs Life Span -->
                      <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 mb-6">
                          <h3 class="text-lg font-semibold mb-4">Health Span Optimization</h3>
                          <div class="grid md:grid-cols-2 gap-8">
                              <div>
                                  <h4 class="font-semibold text-green-700 mb-3">Current Health Span Indicators</h4>
                                  <div class="space-y-3">
                                      <div class="flex justify-between items-center">
                                          <span class="text-sm">Functional Independence</span>
                                          <span class="text-green-600 font-semibold">100%</span>
                                      </div>
                                      <div class="flex justify-between items-center">
                                          <span class="text-sm">Disease-Free Years Projected</span>
                                          <span class="text-green-600 font-semibold">35+ years</span>
                                      </div>
                                      <div class="flex justify-between items-center">
                                          <span class="text-sm">Quality of Life Index</span>
                                          <span class="text-green-600 font-semibold">9.2/10</span>
                                      </div>
                                      <div class="flex justify-between items-center">
                                          <span class="text-sm">Physical Performance</span>
                                          <span class="text-green-600 font-semibold">Excellent</span>
                                      </div>
                                  </div>
                              </div>
                              <div>
                                  <h4 class="font-semibold text-blue-700 mb-3">Longevity Optimization Strategies</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li>• Continue metabolic flexibility training</li>
                                      <li>• Enhance stress adaptability protocols</li>
                                      <li>• Optimize circadian rhythm regulation</li>
                                      <li>• Maintain social connections and purpose</li>
                                      <li>• Regular health monitoring and adjustments</li>
                                  </ul>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Section 11: Medical & Family History -->
              <div class="report-section">
                  <div class="report-header">
                      <i class="fas fa-user-md"></i>
                      <h2>11. Medical & Family History Assessment</h2>
                  </div>
                  <div class="report-content">
                      <div class="mb-6">
                          <p class="text-gray-700 mb-4">
                              Comprehensive medical background including current conditions, past medical history, medications, 
                              family health patterns, and genetic predispositions. This information provides essential context 
                              for risk stratification and personalized treatment planning.
                          </p>
                      </div>
                      
                      ${generateMedicalHistorySection()}
                  </div>
              </div>

              <!-- Section 12: Key Findings Summary -->
              <div class="report-section">
                  <div class="report-header">
                      <i class="fas fa-star"></i>
                      <h2>12. Key Findings Summary</h2>
                  </div>
                  <div class="report-content">
                      <div class="mb-6">
                          <p class="text-gray-700 mb-4">
                              Summary of the most significant findings from your comprehensive health assessment, 
                              highlighting both strengths and opportunities for optimization.
                          </p>
                      </div>
                      
                      <!-- Top Strengths -->
                      <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 mb-8">
                          <h3 class="text-lg font-semibold text-green-800 mb-4">
                              <i class="fas fa-trophy mr-2"></i>Top Health Strengths
                          </h3>
                          <div class="grid md:grid-cols-2 gap-6">
                              <div>
                                  <h4 class="font-semibold text-green-700 mb-3">🏆 Exceptional Areas</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li class="flex items-start">
                                          <i class="fas fa-check-circle text-green-600 mr-2 mt-0.5"></i>
                                          <span><strong>Biological Age Advantage:</strong> 0.2 years younger than chronological age</span>
                                      </li>
                                      <li class="flex items-start">
                                          <i class="fas fa-check-circle text-green-600 mr-2 mt-0.5"></i>
                                          <span><strong>Cardiovascular Health:</strong> Excellent ASCVD risk profile and metabolic markers</span>
                                      </li>
                                      <li class="flex items-start">
                                          <i class="fas fa-check-circle text-green-600 mr-2 mt-0.5"></i>
                                          <span><strong>Metabolic Function:</strong> Optimal glucose control and insulin sensitivity</span>
                                      </li>
                                      <li class="flex items-start">
                                          <i class="fas fa-check-circle text-green-600 mr-2 mt-0.5"></i>
                                          <span><strong>Kidney Function:</strong> Superior eGFR and creatinine levels</span>
                                      </li>
                                  </ul>
                              </div>
                              <div>
                                  <h4 class="font-semibold text-green-700 mb-3">💪 Strong Foundations</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li class="flex items-start">
                                          <i class="fas fa-check-circle text-green-600 mr-2 mt-0.5"></i>
                                          <span><strong>Low Inflammatory Burden:</strong> Optimal C-reactive protein levels</span>
                                      </li>
                                      <li class="flex items-start">
                                          <i class="fas fa-check-circle text-green-600 mr-2 mt-0.5"></i>
                                          <span><strong>Cognitive Function:</strong> Superior executive function and memory</span>
                                      </li>
                                      <li class="flex items-start">
                                          <i class="fas fa-check-circle text-green-600 mr-2 mt-0.5"></i>
                                          <span><strong>Physical Activity:</strong> Excellent exercise routine and recovery</span>
                                      </li>
                                      <li class="flex items-start">
                                          <i class="fas fa-check-circle text-green-600 mr-2 mt-0.5"></i>
                                          <span><strong>Sleep Quality:</strong> Optimal duration and efficiency</span>
                                      </li>
                                  </ul>
                              </div>
                          </div>
                      </div>

                      <!-- Priority Opportunities -->
                      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
                          <h3 class="text-lg font-semibold text-blue-800 mb-4">
                              <i class="fas fa-target mr-2"></i>Priority Optimization Opportunities
                          </h3>
                          <div class="grid md:grid-cols-2 gap-6">
                              <div>
                                  <h4 class="font-semibold text-blue-700 mb-3">🎯 Immediate Focus Areas</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li class="flex items-start">
                                          <i class="fas fa-arrow-up text-blue-600 mr-2 mt-0.5"></i>
                                          <span><strong>LDL Cholesterol:</strong> Optimize from 115 mg/dL to &lt;100 mg/dL</span>
                                      </li>
                                      <li class="flex items-start">
                                          <i class="fas fa-arrow-up text-blue-600 mr-2 mt-0.5"></i>
                                          <span><strong>Stress Management:</strong> Implement daily meditation practice</span>
                                      </li>
                                      <li class="flex items-start">
                                          <i class="fas fa-arrow-up text-blue-600 mr-2 mt-0.5"></i>
                                          <span><strong>Omega-3 Intake:</strong> Increase anti-inflammatory fatty acids</span>
                                      </li>
                                      <li class="flex items-start">
                                          <i class="fas fa-arrow-up text-blue-600 mr-2 mt-0.5"></i>
                                          <span><strong>Social Connections:</strong> Strengthen support network</span>
                                      </li>
                                  </ul>
                              </div>
                              <div>
                                  <h4 class="font-semibold text-blue-700 mb-3">📈 Long-term Goals</h4>
                                  <ul class="space-y-2 text-sm text-gray-700">
                                      <li class="flex items-start">
                                          <i class="fas fa-chart-line text-blue-600 mr-2 mt-0.5"></i>
                                          <span><strong>Telomere Health:</strong> Support cellular aging mechanisms</span>
                                      </li>
                                      <li class="flex items-start">
                                          <i class="fas fa-chart-line text-blue-600 mr-2 mt-0.5"></i>
                                          <span><strong>Hormone Optimization:</strong> Monitor and balance key hormones</span>
                                      </li>
                                      <li class="flex items-start">
                                          <i class="fas fa-chart-line text-blue-600 mr-2 mt-0.5"></i>
                                          <span><strong>Advanced Diagnostics:</strong> Consider additional biomarker testing</span>
                                      </li>
                                      <li class="flex items-start">
                                          <i class="fas fa-chart-line text-blue-600 mr-2 mt-0.5"></i>
                                          <span><strong>Environmental Optimization:</strong> Reduce toxin exposure</span>
                                      </li>
                                  </ul>
                              </div>
                          </div>
                      </div>

                      <!-- Risk vs Protective Factors -->
                      <div class="grid md:grid-cols-2 gap-8">
                          <div class="bg-red-50 rounded-lg p-6">
                              <h3 class="text-lg font-semibold text-red-800 mb-4">
                                  <i class="fas fa-exclamation-triangle mr-2"></i>Risk Factors to Monitor
                              </h3>
                              <ul class="space-y-2 text-sm text-gray-700">
                                  <li>• Borderline LDL cholesterol levels</li>
                                  <li>• Moderate stress levels requiring management</li>
                                  <li>• EMF exposure from technology use</li>
                                  <li>• Age-related telomere shortening</li>
                                  <li>• Potential nutrient deficiencies (B12, D3)</li>
                              </ul>
                          </div>
                          <div class="bg-green-50 rounded-lg p-6">
                              <h3 class="text-lg font-semibold text-green-800 mb-4">
                                  <i class="fas fa-shield-alt mr-2"></i>Protective Factors Present
                              </h3>
                              <ul class="space-y-2 text-sm text-gray-700">
                                  <li>• Excellent metabolic health markers</li>
                                  <li>• Strong cardiovascular fitness</li>
                                  <li>• Low inflammatory burden</li>
                                  <li>• High cognitive reserve</li>
                                  <li>• Consistent exercise routine</li>
                              </ul>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Section 13: Personalized Recommendations -->
              <div class="report-section">
                  <div class="report-header">
                      <i class="fas fa-prescription-bottle-alt"></i>
                      <h2>13. Personalized Recommendations</h2>
                  </div>
                  <div class="report-content">
                      <div class="mb-6">
                          <p class="text-gray-700 mb-4">
                              Evidence-based recommendations tailored to your specific health profile, biomarkers, and risk factors. 
                              Prioritized by impact potential and ease of implementation.
                          </p>
                      </div>
                      
                      <!-- High Priority Recommendations -->
                      <div class="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 mb-8">
                          <h3 class="text-lg font-semibold text-red-800 mb-4">
                              <i class="fas fa-exclamation-circle mr-2"></i>High Priority Interventions
                          </h3>
                          <div class="space-y-6">
                              <div class="bg-white rounded-lg p-4 border border-red-200">
                                  <div class="flex items-start">
                                      <div class="bg-red-100 p-2 rounded-full mr-4 mt-1">
                                          <i class="fas fa-heartbeat text-red-600"></i>
                                      </div>
                                      <div class="flex-1">
                                          <h4 class="font-semibold text-gray-800 mb-2">LDL Cholesterol Optimization</h4>
                                          <p class="text-sm text-gray-600 mb-3">Current: 115 mg/dL | Target: &lt;100 mg/dL</p>
                                          <div class="grid md:grid-cols-2 gap-4">
                                              <div>
                                                  <p class="text-sm font-medium text-gray-700 mb-2">Nutritional Interventions:</p>
                                                  <ul class="text-xs text-gray-600 space-y-1">
                                                      <li>• Increase soluble fiber intake (oats, beans, apples)</li>
                                                      <li>• Add plant sterols/stanols (2g daily)</li>
                                                      <li>• Replace saturated fats with monounsaturated fats</li>
                                                      <li>• Include fatty fish 2-3 times per week</li>
                                                  </ul>
                                              </div>
                                              <div>
                                                  <p class="text-sm font-medium text-gray-700 mb-2">Supplements to Consider:</p>
                                                  <ul class="text-xs text-gray-600 space-y-1">
                                                      <li>• Red yeast rice (consult physician)</li>
                                                      <li>• Bergamot extract (500-1000mg daily)</li>
                                                      <li>• Psyllium husk (5-10g daily)</li>
                                                      <li>• Omega-3 EPA/DHA (2-3g daily)</li>
                                                  </ul>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              <div class="bg-white rounded-lg p-4 border border-red-200">
                                  <div class="flex items-start">
                                      <div class="bg-red-100 p-2 rounded-full mr-4 mt-1">
                                          <i class="fas fa-brain text-red-600"></i>
                                      </div>
                                      <div class="flex-1">
                                          <h4 class="font-semibold text-gray-800 mb-2">Stress Management Protocol</h4>
                                          <p class="text-sm text-gray-600 mb-3">Current stress score: 65/100 | Target: &gt;80/100</p>
                                          <div class="grid md:grid-cols-2 gap-4">
                                              <div>
                                                  <p class="text-sm font-medium text-gray-700 mb-2">Daily Practices:</p>
                                                  <ul class="text-xs text-gray-600 space-y-1">
                                                      <li>• Mindfulness meditation (10-20 minutes)</li>
                                                      <li>• Deep breathing exercises (4-7-8 technique)</li>
                                                      <li>• Progressive muscle relaxation</li>
                                                      <li>• Gratitude journaling (3 items daily)</li>
                                                  </ul>
                                              </div>
                                              <div>
                                                  <p class="text-sm font-medium text-gray-700 mb-2">Lifestyle Adjustments:</p>
                                                  <ul class="text-xs text-gray-600 space-y-1">
                                                      <li>• Establish work-life boundaries</li>
                                                      <li>• Schedule regular downtime</li>
                                                      <li>• Limit news/social media exposure</li>
                                                      <li>• Prioritize time in nature</li>
                                                  </ul>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <!-- Medium Priority Recommendations -->
                      <div class="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-6 mb-8">
                          <h3 class="text-lg font-semibold text-yellow-800 mb-4">
                              <i class="fas fa-balance-scale mr-2"></i>Medium Priority Optimizations
                          </h3>
                          <div class="grid md:grid-cols-2 gap-6">
                              <div class="bg-white rounded-lg p-4 border border-yellow-200">
                                  <h4 class="font-semibold text-gray-800 mb-3">
                                      <i class="fas fa-pills text-yellow-600 mr-2"></i>Nutritional Supplements
                                  </h4>
                                  <div class="space-y-3 text-sm">
                                      <div>
                                          <p class="font-medium text-gray-700">Vitamin D3</p>
                                          <p class="text-gray-600">2000-4000 IU daily (current: 32 ng/mL, target: 50-80 ng/mL)</p>
                                      </div>
                                      <div>
                                          <p class="font-medium text-gray-700">Magnesium Glycinate</p>
                                          <p class="text-gray-600">400-600mg before bed (supports sleep and muscle recovery)</p>
                                      </div>
                                      <div>
                                          <p class="font-medium text-gray-700">Vitamin B Complex</p>
                                          <p class="text-gray-600">High-potency formula (supports energy and neurological function)</p>
                                      </div>
                                      <div>
                                          <p class="font-medium text-gray-700">Probiotics</p>
                                          <p class="text-gray-600">Multi-strain formula, 50+ billion CFU (gut health optimization)</p>
                                      </div>
                                  </div>
                              </div>

                              <div class="bg-white rounded-lg p-4 border border-yellow-200">
                                  <h4 class="font-semibold text-gray-800 mb-3">
                                      <i class="fas fa-dumbbell text-yellow-600 mr-2"></i>Exercise Optimization
                                  </h4>
                                  <div class="space-y-3 text-sm">
                                      <div>
                                          <p class="font-medium text-gray-700">High-Intensity Interval Training</p>
                                          <p class="text-gray-600">2x per week, 20-30 minutes (metabolic flexibility)</p>
                                      </div>
                                      <div>
                                          <p class="font-medium text-gray-700">Zone 2 Cardio</p>
                                          <p class="text-gray-600">2-3x per week, 45-60 minutes (mitochondrial health)</p>
                                      </div>
                                      <div>
                                          <p class="font-medium text-gray-700">Resistance Training</p>
                                          <p class="text-gray-600">Continue 3x per week (maintain muscle mass and bone density)</p>
                                      </div>
                                      <div>
                                          <p class="font-medium text-gray-700">Flexibility & Mobility</p>
                                          <p class="text-gray-600">Daily 10-15 minutes (joint health and injury prevention)</p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <!-- Long-term Recommendations -->
                      <div class="bg-green-50 border-l-4 border-green-500 rounded-lg p-6 mb-8">
                          <h3 class="text-lg font-semibold text-green-800 mb-4">
                              <i class="fas fa-seedling mr-2"></i>Long-term Health Strategies
                          </h3>
                          <div class="grid md:grid-cols-3 gap-6">
                              <div class="bg-white rounded-lg p-4 border border-green-200">
                                  <h4 class="font-semibold text-gray-800 mb-3">
                                      <i class="fas fa-calendar-alt text-green-600 mr-2"></i>6-Month Goals
                                  </h4>
                                  <ul class="text-sm text-gray-600 space-y-2">
                                      <li>• LDL cholesterol &lt;100 mg/dL</li>
                                      <li>• Stress management score &gt;80</li>
                                      <li>• Vitamin D levels 50-80 ng/mL</li>
                                      <li>• Establish consistent meditation practice</li>
                                      <li>• Complete advanced lipid panel</li>
                                  </ul>
                              </div>

                              <div class="bg-white rounded-lg p-4 border border-green-200">
                                  <h4 class="font-semibold text-gray-800 mb-3">
                                      <i class="fas fa-chart-line text-green-600 mr-2"></i>1-Year Targets
                                  </h4>
                                  <ul class="text-sm text-gray-600 space-y-2">
                                      <li>• Maintain biological age advantage</li>
                                      <li>• Optimize hormone levels</li>
                                      <li>• Complete telomere length testing</li>
                                      <li>• Achieve optimal body composition</li>
                                      <li>• Implement intermittent fasting protocol</li>
                                  </ul>
                              </div>

                              <div class="bg-white rounded-lg p-4 border border-green-200">
                                  <h4 class="font-semibold text-gray-800 mb-3">
                                      <i class="fas fa-mountain text-green-600 mr-2"></i>5-Year Vision
                                  </h4>
                                  <ul class="text-sm text-gray-600 space-y-2">
                                      <li>• Maintain disease-free status</li>
                                      <li>• Achieve longevity biomarker targets</li>
                                      <li>• Optimize cellular aging markers</li>
                                      <li>• Build resilience against age-related decline</li>
                                      <li>• Maintain high quality of life</li>
                                  </ul>
                              </div>
                          </div>
                      </div>

                      <!-- Medical Follow-up -->
                      <div class="bg-blue-50 rounded-lg p-6">
                          <h3 class="text-lg font-semibold text-blue-800 mb-4">
                              <i class="fas fa-stethoscope mr-2"></i>Recommended Medical Follow-up
                          </h3>
                          <div class="grid md:grid-cols-2 gap-6">
                              <div>
                                  <h4 class="font-semibold text-blue-700 mb-3">Immediate Consultations</h4>
                                  <ul class="text-sm text-gray-700 space-y-2">
                                      <li>• Discuss LDL optimization with primary care physician</li>
                                      <li>• Consider cardiology consultation for advanced lipid testing</li>
                                      <li>• Nutritionist consultation for personalized meal planning</li>
                                      <li>• Stress management counselor or therapist</li>
                                  </ul>
                              </div>
                              <div>
                                  <h4 class="font-semibold text-blue-700 mb-3">Additional Testing to Consider</h4>
                                  <ul class="text-sm text-gray-700 space-y-2">
                                      <li>• Advanced lipid particle analysis (NMR or Ion Mobility)</li>
                                      <li>• Comprehensive hormone panel</li>
                                      <li>• Omega-3 fatty acid levels</li>
                                      <li>• Methylation pathway analysis</li>
                                      <li>• Comprehensive micronutrient panel</li>
                                  </ul>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Section 14: Areas for Optimization -->
              <div class="report-section">
                  <div class="report-header">
                      <i class="fas fa-chart-line"></i>
                      <h2>14. Areas for Optimization</h2>
                  </div>
                  <div class="report-content">
                      <div class="mb-6">
                          <p class="text-gray-700 mb-4">
                              Specific areas identified for improvement based on your current health status and biomarkers. 
                              These represent the greatest opportunities for enhancing your health span and longevity.
                          </p>
                      </div>
                      
                      <!-- Optimization Categories -->
                      <div class="space-y-8">
                          <!-- Biomarker Optimization -->
                          <div class="bg-red-50 rounded-lg p-6">
                              <h3 class="text-lg font-semibold text-red-800 mb-4">
                                  <i class="fas fa-flask mr-2"></i>Biomarker Optimization
                              </h3>
                              <div class="grid md:grid-cols-2 gap-6">
                                  <div>
                                      <h4 class="font-semibold text-red-700 mb-3">Current Suboptimal Levels</h4>
                                      <div class="space-y-3">
                                          <div class="bg-white rounded-lg p-3 border border-red-200">
                                              <div class="flex justify-between items-center mb-2">
                                                  <span class="font-medium text-gray-800">LDL Cholesterol</span>
                                                  <span class="text-red-600 font-semibold">115 mg/dL</span>
                                              </div>
                                              <div class="flex justify-between items-center text-sm">
                                                  <span class="text-gray-600">Target: &lt;100 mg/dL</span>
                                                  <span class="text-red-600">↓ 15 mg/dL needed</span>
                                              </div>
                                          </div>
                                          
                                          <div class="bg-white rounded-lg p-3 border border-yellow-200">
                                              <div class="flex justify-between items-center mb-2">
                                                  <span class="font-medium text-gray-800">Vitamin D</span>
                                                  <span class="text-yellow-600 font-semibold">32 ng/mL</span>
                                              </div>
                                              <div class="flex justify-between items-center text-sm">
                                                  <span class="text-gray-600">Target: 50-80 ng/mL</span>
                                                  <span class="text-yellow-600">↑ 18+ ng/mL needed</span>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                  <div>
                                      <h4 class="font-semibold text-green-700 mb-3">Optimization Strategies</h4>
                                      <div class="space-y-3 text-sm text-gray-700">
                                          <div>
                                              <p class="font-medium">LDL Cholesterol Reduction:</p>
                                              <ul class="ml-4 mt-1 text-xs space-y-1">
                                                  <li>• Plant sterol supplementation</li>
                                                  <li>• Increase soluble fiber intake</li>
                                                  <li>• Mediterranean diet pattern</li>
                                                  <li>• Regular aerobic exercise</li>
                                              </ul>
                                          </div>
                                          <div>
                                              <p class="font-medium">Vitamin D Optimization:</p>
                                              <ul class="ml-4 mt-1 text-xs space-y-1">
                                                  <li>• D3 supplementation 4000 IU daily</li>
                                                  <li>• Take with fat-containing meal</li>
                                                  <li>• Retest in 8-12 weeks</li>
                                                  <li>• Consider K2 co-supplementation</li>
                                              </ul>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <!-- Lifestyle Optimization -->
                          <div class="bg-blue-50 rounded-lg p-6">
                              <h3 class="text-lg font-semibold text-blue-800 mb-4">
                                  <i class="fas fa-leaf mr-2"></i>Lifestyle Optimization
                              </h3>
                              <div class="grid md:grid-cols-3 gap-6">
                                  <div class="bg-white rounded-lg p-4 border border-blue-200">
                                      <h4 class="font-semibold text-blue-700 mb-3">Stress Management</h4>
                                      <div class="space-y-2 text-sm">
                                          <div class="flex justify-between">
                                              <span>Current Score:</span>
                                              <span class="text-yellow-600 font-medium">65/100</span>
                                          </div>
                                          <div class="flex justify-between">
                                              <span>Target Score:</span>
                                              <span class="text-green-600 font-medium">85/100</span>
                                          </div>
                                          <p class="text-xs text-gray-600 mt-2">
                                              Implementation of daily mindfulness practices and stress reduction techniques needed.
                                          </p>
                                      </div>
                                  </div>

                                  <div class="bg-white rounded-lg p-4 border border-blue-200">
                                      <h4 class="font-semibold text-blue-700 mb-3">Social Connection</h4>
                                      <div class="space-y-2 text-sm">
                                          <div class="flex justify-between">
                                              <span>Current Score:</span>
                                              <span class="text-yellow-600 font-medium">Moderate</span>
                                          </div>
                                          <div class="flex justify-between">
                                              <span>Target Score:</span>
                                              <span class="text-green-600 font-medium">Strong</span>
                                          </div>
                                          <p class="text-xs text-gray-600 mt-2">
                                              Strengthen social networks and community engagement for longevity benefits.
                                          </p>
                                      </div>
                                  </div>

                                  <div class="bg-white rounded-lg p-4 border border-blue-200">
                                      <h4 class="font-semibold text-blue-700 mb-3">Environmental</h4>
                                      <div class="space-y-2 text-sm">
                                          <div class="flex justify-between">
                                              <span>EMF Exposure:</span>
                                              <span class="text-yellow-600 font-medium">Moderate</span>
                                          </div>
                                          <div class="flex justify-between">
                                              <span>Air Quality:</span>
                                              <span class="text-green-600 font-medium">Good</span>
                                          </div>
                                          <p class="text-xs text-gray-600 mt-2">
                                              Consider EMF reduction strategies and air purification systems.
                                          </p>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <!-- Longevity Optimization -->
                          <div class="bg-purple-50 rounded-lg p-6">
                              <h3 class="text-lg font-semibold text-purple-800 mb-4">
                                  <i class="fas fa-hourglass-half mr-2"></i>Longevity Optimization
                              </h3>
                              <div class="grid md:grid-cols-2 gap-6">
                                  <div>
                                      <h4 class="font-semibold text-purple-700 mb-3">Cellular Health</h4>
                                      <div class="space-y-3">
                                          <div class="bg-white rounded-lg p-3 border border-purple-200">
                                              <p class="font-medium text-gray-800 mb-2">Autophagy Enhancement</p>
                                              <ul class="text-xs text-gray-600 space-y-1">
                                                  <li>• Consider intermittent fasting protocols</li>
                                                  <li>• Optimize sleep quality for cellular repair</li>
                                                  <li>• Include spermidine-rich foods</li>
                                                  <li>• Regular exercise for autophagy stimulation</li>
                                              </ul>
                                          </div>
                                          <div class="bg-white rounded-lg p-3 border border-purple-200">
                                              <p class="font-medium text-gray-800 mb-2">Telomere Health</p>
                                              <ul class="text-xs text-gray-600 space-y-1">
                                                  <li>• Stress reduction (cortisol management)</li>
                                                  <li>• Omega-3 fatty acid optimization</li>
                                                  <li>• Consider telomerase-supporting nutrients</li>
                                                  <li>• Maintain optimal vitamin D levels</li>
                                              </ul>
                                          </div>
                                      </div>
                                  </div>
                                  <div>
                                      <h4 class="font-semibold text-purple-700 mb-3">Metabolic Optimization</h4>
                                      <div class="space-y-3">
                                          <div class="bg-white rounded-lg p-3 border border-purple-200">
                                              <p class="font-medium text-gray-800 mb-2">Mitochondrial Support</p>
                                              <ul class="text-xs text-gray-600 space-y-1">
                                                  <li>• CoQ10 supplementation consideration</li>
                                                  <li>• PQQ for mitochondrial biogenesis</li>
                                                  <li>• Cold exposure therapy</li>
                                                  <li>• Zone 2 cardio training</li>
                                              </ul>
                                          </div>
                                          <div class="bg-white rounded-lg p-3 border border-purple-200">
                                              <p class="font-medium text-gray-800 mb-2">Metabolic Flexibility</p>
                                              <ul class="text-xs text-gray-600 space-y-1">
                                                  <li>• Time-restricted eating windows</li>
                                                  <li>• Ketone body optimization</li>
                                                  <li>• Glucose variability monitoring</li>
                                                  <li>• Fat oxidation capacity training</li>
                                              </ul>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <!-- Priority Action Plan -->
                          <div class="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6">
                              <h3 class="text-lg font-semibold text-orange-800 mb-4">
                                  <i class="fas fa-rocket mr-2"></i>30-Day Priority Action Plan
                              </h3>
                              <div class="grid md:grid-cols-2 gap-6">
                                  <div>
                                      <h4 class="font-semibold text-orange-700 mb-3">Week 1-2: Foundation</h4>
                                      <ul class="text-sm text-gray-700 space-y-2">
                                          <li class="flex items-start">
                                              <i class="fas fa-check-square text-orange-600 mr-2 mt-1"></i>
                                              <span>Start Vitamin D3 supplementation (4000 IU daily)</span>
                                          </li>
                                          <li class="flex items-start">
                                              <i class="fas fa-check-square text-orange-600 mr-2 mt-1"></i>
                                              <span>Begin daily 10-minute meditation practice</span>
                                          </li>
                                          <li class="flex items-start">
                                              <i class="fas fa-check-square text-orange-600 mr-2 mt-1"></i>
                                              <span>Increase soluble fiber intake (add oats, beans)</span>
                                          </li>
                                          <li class="flex items-start">
                                              <i class="fas fa-check-square text-orange-600 mr-2 mt-1"></i>
                                              <span>Schedule physician consultation for LDL optimization</span>
                                          </li>
                                      </ul>
                                  </div>
                                  <div>
                                      <h4 class="font-semibold text-orange-700 mb-3">Week 3-4: Integration</h4>
                                      <ul class="text-sm text-gray-700 space-y-2">
                                          <li class="flex items-start">
                                              <i class="fas fa-check-square text-orange-600 mr-2 mt-1"></i>
                                              <span>Add omega-3 supplementation (2-3g EPA/DHA daily)</span>
                                          </li>
                                          <li class="flex items-start">
                                              <i class="fas fa-check-square text-orange-600 mr-2 mt-1"></i>
                                              <span>Implement stress reduction techniques</span>
                                          </li>
                                          <li class="flex items-start">
                                              <i class="fas fa-check-square text-orange-600 mr-2 mt-1"></i>
                                              <span>Order advanced lipid panel testing</span>
                                          </li>
                                          <li class="flex items-start">
                                              <i class="fas fa-check-square text-orange-600 mr-2 mt-1"></i>
                                              <span>Establish consistent sleep optimization routine</span>
                                          </li>
                                      </ul>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Footer -->
              <div class="mt-12 p-6 bg-gray-100 rounded-lg text-center text-sm text-gray-600">
                  <p><strong>Medical Disclaimer:</strong> This assessment tool is for educational and informational purposes only. 
                  It is not intended to replace professional medical advice, diagnosis, or treatment. 
                  Always seek the advice of your physician or other qualified health provider with any questions 
                  you may have regarding a medical condition.</p>
                  
                  <div class="mt-4 pt-4 border-t border-gray-300">
                      <p class="font-semibold">Dr. Graham Player, Ph.D</p>
                      <p>Professional Healthcare Innovation Consultant – Longenix Health</p>
                      <p>Predict • Prevent • Persist</p>
                  </div>
              </div>
          </div>

          <script>
              // PDF Generation Functions
              function downloadReportPDF() {
                  // Show loading indicator
                  const button = event.target.closest('button');
                  const originalText = button.innerHTML;
                  button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generating PDF...';
                  button.disabled = true;
                  
                  // Configure jsPDF
                  const { jsPDF } = window.jspdf;
                  
                  // Get the main content area (excluding header)
                  const reportContent = document.querySelector('.max-w-7xl.mx-auto.px-6.py-8');
                  
                  // Configure html2canvas options
                  const options = {
                      scale: 2, // Higher resolution
                      useCORS: true,
                      allowTaint: true,
                      backgroundColor: '#ffffff',
                      width: reportContent.scrollWidth,
                      height: reportContent.scrollHeight,
                      scrollX: 0,
                      scrollY: 0
                  };
                  
                  html2canvas(reportContent, options).then(canvas => {
                      const imgData = canvas.toDataURL('image/png');
                      
                      // Calculate dimensions
                      const imgWidth = 210; // A4 width in mm
                      const pageHeight = 295; // A4 height in mm
                      const imgHeight = (canvas.height * imgWidth) / canvas.width;
                      let heightLeft = imgHeight;
                      
                      // Create PDF
                      const pdf = new jsPDF('p', 'mm', 'a4');
                      let position = 0;
                      
                      // Add first page
                      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                      heightLeft -= pageHeight;
                      
                      // Add additional pages if needed
                      while (heightLeft >= 0) {
                          position = heightLeft - imgHeight;
                          pdf.addPage();
                          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                          heightLeft -= pageHeight;
                      }
                      
                      // Generate filename with patient name and date
                      const patientName = '${session.full_name}';
                      const date = new Date().toISOString().split('T')[0];
                      const filename = \`Health_Assessment_Report_\${patientName.replace(/[^a-z0-9]/gi, '_')}_\${date}.pdf\`;
                      
                      // Download PDF
                      pdf.save(filename);
                      
                      // Reset button
                      button.innerHTML = originalText;
                      button.disabled = false;
                  }).catch(error => {
                      console.error('PDF generation error:', error);
                      alert('Error generating PDF. Please try again.');
                      
                      // Reset button
                      button.innerHTML = originalText;
                      button.disabled = false;
                  });
              }
          </script>
      </body>
      </html>
    `)
  } catch (error) {
    console.error('Report generation error:', error)
    return c.html(`<h1>Error generating report: ${error.message}</h1>`)
  }
})

// Favicon route
app.get('/favicon.ico', (c) => {
  return c.text('', 204) // No content
})

// Assessment form route
app.get('/comprehensive-assessment', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comprehensive Health Assessment - Longenix Health</title>
        
        <!-- Meta tags -->
        <meta name="description" content="Complete comprehensive health assessment covering functional medicine, lifestyle, mental health, and environmental factors.">
        
        <!-- External Stylesheets -->
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/css/styles.css" rel="stylesheet">
        
        <!-- Custom Styles -->
        <style>
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: .5; }
            }
            .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
                50% { transform: none; animation-timing-function: cubic-bezier(0,0,0.2,1); }
            }
            .animate-bounce { animation: bounce 1s infinite; }
        </style>
    </head>
    <body class="bg-gray-50 min-h-screen">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center">
                        <i class="fas fa-dna text-3xl text-blue-600 mr-3"></i>
                        <div>
                            <h1 class="text-2xl font-bold text-gray-900">Longenix Health</h1>
                            <p class="text-sm text-gray-500">Comprehensive Health Assessment</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <a href="/" class="text-gray-600 hover:text-gray-900 transition-colors">
                            <i class="fas fa-home mr-1"></i>Home
                        </a>
                        <button id="logoutBtn" class="text-red-600 hover:text-red-700 transition-colors">
                            <i class="fas fa-sign-out-alt mr-1"></i>Logout
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="py-8">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div id="assessmentContainer">
                    <!-- Assessment interface will be rendered here by JavaScript -->
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="bg-white border-t mt-16">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div class="text-center text-gray-600">
                    <p>&copy; 2024 Longenix Health. All rights reserved.</p>
                    <p class="text-sm mt-2">Comprehensive Chronic Disease Risk Assessment System</p>
                    <p class="text-xs mt-1">Dr. Graham Player, Ph.D - Evidence-Based Health Analytics</p>
                </div>
            </div>
        </footer>

        <!-- Scripts -->
        <script src="/js/comprehensive-assessment.js"></script>
    </body>
    </html>
  `)
})

app.get('/assessment', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comprehensive Health Assessment Form - Longenix Health</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/css/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <!-- Header -->
        <div class="gradient-bg text-white">
            <div class="max-w-7xl mx-auto px-6 py-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-2xl font-bold">Dynamic Health Assessment Form</h1>
                        <p class="text-blue-100">Complete health evaluation with real-time processing</p>
                    </div>
                    <a href="/" class="bg-white bg-opacity-20 px-4 py-2 rounded-lg hover:bg-opacity-30 transition">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Home
                    </a>
                </div>
            </div>
        </div>

        <!-- Progress Bar -->
        <div class="bg-white py-4">
            <div class="max-w-4xl mx-auto px-6">
                <div class="flex items-center justify-between mb-4">
                    <span class="text-sm font-medium text-gray-700">Step <span id="currentStep">1</span> of 8</span>
                    <span class="text-sm text-gray-500"><span id="progressPercent">12</span>% Complete</span>
                </div>
                <div class="progress-bar">
                    <div id="progressFill" class="progress-fill" style="width: 12%"></div>
                </div>
            </div>
        </div>

        <!-- Form Container -->
        <div class="max-w-4xl mx-auto px-6 py-8">
            <form id="dynamicAssessmentForm" class="bg-white rounded-lg shadow-lg p-8">
                
                <!-- Step 1: Demographics & Personal Information -->
                <div id="step1" class="assessment-step">
                    <div class="text-center mb-8">
                        <i class="fas fa-user text-4xl text-blue-600 mb-4"></i>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">Personal Information</h2>
                        <p class="text-gray-600">Your data will create YOUR personalized report</p>
                    </div>

                    <div class="grid md:grid-cols-2 gap-6">
                        <div class="form-group">
                            <label class="form-label">Full Name *</label>
                            <input type="text" name="fullName" class="form-input" placeholder="Enter your full name" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Date of Birth *</label>
                            <input type="date" name="dateOfBirth" class="form-input" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Gender *</label>
                            <select name="gender" class="form-select" required>
                                <option value="">Select gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Ethnicity</label>
                            <select name="ethnicity" class="form-select">
                                <option value="">Select ethnicity</option>
                                <option value="caucasian">Caucasian</option>
                                <option value="african_american">African American</option>
                                <option value="hispanic">Hispanic/Latino</option>
                                <option value="asian">Asian</option>
                                <option value="native_american">Native American</option>
                                <option value="pacific_islander">Pacific Islander</option>
                                <option value="mixed">Mixed</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Email Address</label>
                            <input type="email" name="email" class="form-input" placeholder="your.email@example.com">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Phone Number</label>
                            <input type="tel" name="phone" class="form-input" placeholder="+1 (555) 123-4567">
                        </div>
                    </div>
                </div>

                <!-- Navigation Buttons -->
                <div class="flex justify-between mt-8">
                    <button type="button" id="prevBtn" class="bg-gray-300 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-400 transition duration-300 hidden">
                        <i class="fas fa-arrow-left mr-2"></i>Previous
                    </button>
                    <button type="button" id="nextBtn" class="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition duration-300">
                        Next<i class="fas fa-arrow-right ml-2"></i>
                    </button>
                    <button type="submit" id="submitBtn" class="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition duration-300 hidden">
                        <i class="fas fa-check mr-2"></i>Generate Report
                    </button>
                </div>
            </form>
        </div>

        <!-- Loading Overlay -->
        <div id="loadingOverlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden flex items-center justify-center">
            <div class="bg-white rounded-lg p-8 text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p class="text-gray-600">Processing your personalized assessment...</p>
            </div>
        </div>

        <!-- JavaScript -->
        <script src="/js/assessment.js"></script>
    </body>
    </html>
  `)
})

// API endpoint to save assessment data
app.post('/api/assessment/save', async (c) => {
  const { env } = c
  const data = await c.req.json()
  
  try {
    // Create patient record
    const patientResult = await env.DB.prepare(`
      INSERT INTO patients (full_name, date_of_birth, gender, ethnicity, email, phone, country)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.fullName,
      data.dateOfBirth,
      data.gender,
      data.ethnicity || null,
      data.email || null,
      data.phone || null,
      data.country || 'US'
    ).run()

    const patientId = patientResult.meta.last_row_id

    // Create assessment session
    const sessionResult = await env.DB.prepare(`
      INSERT INTO assessment_sessions (patient_id, session_type, status)
      VALUES (?, 'manual', 'in_progress')
    `).bind(patientId).run()

    const sessionId = sessionResult.meta.last_row_id

    return c.json({
      success: true,
      patientId,
      sessionId,
      message: 'Assessment data saved successfully'
    })
  } catch (error) {
    console.error('Database error:', error)
    return c.json({
      success: false,
      error: 'Failed to save assessment data'
    }, 500)
  }
})

// API endpoint to complete assessment and calculate results
app.post('/api/assessment/complete', async (c) => {
  const { env } = c
  const { sessionId, patientId, assessmentData } = await c.req.json()
  
  try {
    // Medical algorithms are imported at the top
    
    // Get patient data for calculations
    const patient = await env.DB.prepare(`
      SELECT * FROM patients WHERE id = ?
    `).bind(patientId).first()

    if (!patient) {
      return c.json({ success: false, error: 'Patient not found' }, 404)
    }

    // Calculate age from date of birth
    const birthDate = new Date(patient.date_of_birth)
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))

    // Prepare patient data for algorithms
    const patientData = {
      age,
      gender: patient.gender,
      height_cm: parseFloat(assessmentData.height) || 170,
      weight_kg: parseFloat(assessmentData.weight) || 70,
      systolic_bp: parseInt(assessmentData.systolicBP) || 120,
      diastolic_bp: parseInt(assessmentData.diastolicBP) || 80,
      biomarkers: {
        // Basic metabolic panel
        glucose: parseFloat(assessmentData.glucose) || null,
        hba1c: parseFloat(assessmentData.hba1c) || null,
        insulin: parseFloat(assessmentData.insulin) || null,
        
        // Lipid panel
        total_cholesterol: parseFloat(assessmentData.totalCholesterol) || null,
        hdl_cholesterol: parseFloat(assessmentData.hdlCholesterol) || null,
        ldl_cholesterol: parseFloat(assessmentData.ldlCholesterol) || null,
        triglycerides: parseFloat(assessmentData.triglycerides) || null,
        
        // Kidney function
        creatinine: parseFloat(assessmentData.creatinine) || null,
        egfr: parseFloat(assessmentData.egfr) || null,
        albumin: parseFloat(assessmentData.albumin) || null,
        albumin_creatinine_ratio: parseFloat(assessmentData.albuminCreatinineRatio) || null,
        
        // Inflammatory markers
        c_reactive_protein: parseFloat(assessmentData.cReactiveProtein) || null,
        
        // Complete blood count
        white_blood_cells: parseFloat(assessmentData.whiteBoodCells) || null,
        lymphocyte_percent: parseFloat(assessmentData.lymphocytePercent) || null,
        hemoglobin: parseFloat(assessmentData.hemoglobin) || null,
        mean_cell_volume: parseFloat(assessmentData.meanCellVolume) || null,
        red_cell_distribution_width: parseFloat(assessmentData.redCellDistributionWidth) || null,
        
        // Liver function
        alkaline_phosphatase: parseFloat(assessmentData.alkalinePhosphatase) || null,
        
        // Cardiovascular markers
        systolic_bp: parseInt(assessmentData.systolicBP) || null,
        diastolic_bp: parseInt(assessmentData.diastolicBP) || null,
        
        // Lifestyle and risk factors
        smoking: assessmentData.smoking === 'yes' ? 1 : 0,
        diabetes: assessmentData.diabetes === 'yes' ? 1 : 0,
        bp_medication: assessmentData.bpMedication === 'yes' ? 1 : 0,
        
        // Additional biomarkers for comprehensive assessment
        vitamin_d: parseFloat(assessmentData.vitaminD) || null,
        vitamin_b12: parseFloat(assessmentData.vitaminB12) || null,
        folate: parseFloat(assessmentData.folate) || null,
        homocysteine: parseFloat(assessmentData.homocysteine) || null,
        psa: parseFloat(assessmentData.psa) || null, // Prostate-specific antigen
        estradiol: parseFloat(assessmentData.estradiol) || null,
        waist_circumference: parseFloat(assessmentData.waistCircumference) || null,
        uric_acid: parseFloat(assessmentData.uricAcid) || null,
        
        // Neurodegeneration markers (if available)
        amyloid_beta_42: parseFloat(assessmentData.amyloidBeta42) || null,
        tau_protein: parseFloat(assessmentData.tauProtein) || null,
        neurofilament_light: parseFloat(assessmentData.neurofilamentLight) || null,
        
        // Genetic markers (if available)
        apoe_e4_carrier: assessmentData.apoeE4Carrier === 'yes',
        
        // Additional risk factors
        fibrinogen: parseFloat(assessmentData.fibrinogen) || null,
        d_dimer: parseFloat(assessmentData.dDimer) || null,
        adiponectin: parseFloat(assessmentData.adiponectin) || null,
        cortisol: parseFloat(assessmentData.cortisol) || null,
        homa_ir: parseFloat(assessmentData.homaIr) || null, // HOMA-IR insulin resistance index
        
        // Clinical history markers
        previous_mi: assessmentData.previousMI === 'yes' ? 1 : 0,
        atrial_fibrillation: assessmentData.atrialFibrillation === 'yes' ? 1 : 0,
        lvh: assessmentData.leftVentricularHypertrophy === 'yes' ? 1 : 0,
        carotid_stenosis: parseFloat(assessmentData.carotidStenosis) || null,
        proteinuria: parseFloat(assessmentData.proteinuria) || null
      }
    }

    // Calculate biological age
    const biologicalAge = BiologicalAgeCalculator.calculateBiologicalAge(patientData)

    // Calculate disease risks - All 7 categories
    const ascvdRisk = DiseaseRiskCalculator.calculateASCVDRisk(patientData)
    const diabetesRisk = DiseaseRiskCalculator.calculateDiabetesRisk(patientData, assessmentData.lifestyle || {})
    const kidneyRisk = DiseaseRiskCalculator.calculateKidneyDiseaseRisk(patientData)
    const cancerRisk = DiseaseRiskCalculator.calculateCancerRisk(patientData, assessmentData.lifestyle || {})
    const cognitiveRisk = DiseaseRiskCalculator.calculateCognitiveDeclineRisk(patientData, assessmentData.lifestyle || {})
    const metabolicSyndromeRisk = DiseaseRiskCalculator.calculateMetabolicSyndromeRisk(patientData)
    const strokeRisk = DiseaseRiskCalculator.calculateStrokeRisk(patientData, assessmentData.lifestyle || {})

    // Save biological age results
    await env.DB.prepare(`
      INSERT INTO biological_age (session_id, chronological_age, phenotypic_age, klemera_doubal_age, 
                                 metabolic_age, telomere_age, average_biological_age, age_advantage, calculation_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      age,
      biologicalAge.phenotypic_age,
      biologicalAge.klemera_doubal_age,
      biologicalAge.metabolic_age,
      biologicalAge.telomere_age,
      biologicalAge.average_biological_age,
      biologicalAge.age_advantage,
      'Phenotypic Age + KDM + Metabolic Age'
    ).run()

    // Save risk assessments - All 7 disease categories
    const risks = [ascvdRisk, diabetesRisk, kidneyRisk, cancerRisk, cognitiveRisk, metabolicSyndromeRisk, strokeRisk]
    for (const risk of risks) {
      await env.DB.prepare(`
        INSERT INTO risk_calculations (session_id, risk_category, risk_score, risk_level, 
                                     ten_year_risk, algorithm_used)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        sessionId,
        risk.risk_category,
        risk.risk_score,
        risk.risk_level,
        risk.ten_year_risk,
        risk.algorithm_used
      ).run()
    }

    // Update session status
    await env.DB.prepare(`
      UPDATE assessment_sessions SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(sessionId).run()

    return c.json({
      success: true,
      sessionId,
      biologicalAge,
      risks,
      message: 'Assessment completed and results calculated'
    })
  } catch (error) {
    console.error('Assessment completion error:', error)
    return c.json({
      success: false,
      error: 'Failed to complete assessment'
    }, 500)
  }
})

// API endpoint to process comprehensive assessment
app.post('/api/assessment/comprehensive', async (c) => {
  const { env } = c
  const assessmentData = await c.req.json()
  
  try {
    // Create patient record from comprehensive data
    const demo = assessmentData.demographics
    const clinical = assessmentData.clinical
    
    // Calculate age from date of birth
    const birthDate = new Date(demo.dateOfBirth)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    
    const patientResult = await env.DB.prepare(`
      INSERT INTO patients (full_name, date_of_birth, gender, ethnicity, email, phone, country)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      demo.fullName,
      demo.dateOfBirth,
      demo.gender,
      demo.ethnicity || 'not_specified',
      demo.email,
      demo.phone || '',
      'US' // Default country
    ).run()

    const patientId = patientResult.meta.last_row_id

    // Create assessment session
    const sessionResult = await env.DB.prepare(`
      INSERT INTO assessment_sessions (patient_id, session_type, status)
      VALUES (?, 'comprehensive', 'completed')
    `).bind(patientId).run()

    const sessionId = sessionResult.meta.last_row_id

    // Prepare patient data for medical algorithms
    const patientData = {
      age: age,
      gender: demo.gender as 'male' | 'female' | 'other',
      height_cm: clinical.height || 170,
      weight_kg: clinical.weight || 70,
      systolic_bp: clinical.systolicBP || 120,
      diastolic_bp: clinical.diastolicBP || 80,
      biomarkers: {
        glucose: assessmentData.biomarkers?.glucose || null,
        hba1c: assessmentData.biomarkers?.hba1c || null,
        total_cholesterol: assessmentData.biomarkers?.totalCholesterol || null,
        hdl_cholesterol: assessmentData.biomarkers?.hdlCholesterol || null,
        ldl_cholesterol: assessmentData.biomarkers?.ldlCholesterol || null,
        triglycerides: assessmentData.biomarkers?.triglycerides || null,
        creatinine: assessmentData.biomarkers?.creatinine || null,
        albumin: assessmentData.biomarkers?.albumin || null,
        c_reactive_protein: assessmentData.biomarkers?.crp || null,
        // Add estimated values for missing biomarkers based on assessment data
        white_blood_cells: 6.5,
        hemoglobin: demo.gender === 'female' ? 13.8 : 15.2,
        egfr: clinical.age < 60 ? 95 : Math.max(60, 120 - age)
      }
    }

    // Calculate all medical results
    const biologicalAge = BiologicalAgeCalculator.calculateBiologicalAge(patientData)
    const ascvdRisk = DiseaseRiskCalculator.calculateASCVDRisk(patientData)
    const diabetesRisk = DiseaseRiskCalculator.calculateDiabetesRisk(patientData, {})
    const kidneyRisk = DiseaseRiskCalculator.calculateKidneyDiseaseRisk(patientData)
    const cancerRisk = DiseaseRiskCalculator.calculateCancerRisk(patientData, {})
    const cognitiveRisk = DiseaseRiskCalculator.calculateCognitiveDeclineRisk(patientData, {})
    const metabolicSyndromeRisk = DiseaseRiskCalculator.calculateMetabolicSyndromeRisk(patientData)
    const strokeRisk = DiseaseRiskCalculator.calculateStrokeRisk(patientData, {})

    // Store comprehensive assessment data as JSON
    await env.DB.prepare(`
      INSERT INTO assessment_data (session_id, data_type, json_data, created_at)
      VALUES (?, 'comprehensive_lifestyle', ?, datetime('now'))
    `).bind(
      sessionId,
      JSON.stringify(assessmentData)
    ).run()

    // Save biological age results
    await env.DB.prepare(`
      INSERT INTO biological_age (session_id, chronological_age, phenotypic_age, klemera_doubal_age, 
                                 metabolic_age, telomere_age, average_biological_age, age_advantage, calculation_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      age,
      biologicalAge.phenotypic_age,
      biologicalAge.klemera_doubal_age,
      biologicalAge.metabolic_age,
      biologicalAge.telomere_age,
      biologicalAge.average_biological_age,
      biologicalAge.age_advantage,
      'Comprehensive: Phenotypic Age + KDM + Metabolic Age'
    ).run()

    // Save all disease risk assessments
    const risks = [
      { category: 'cardiovascular', result: ascvdRisk },
      { category: 'diabetes', result: diabetesRisk },
      { category: 'kidney_disease', result: kidneyRisk },
      { category: 'cancer_risk', result: cancerRisk },
      { category: 'cognitive_decline', result: cognitiveRisk },
      { category: 'metabolic_syndrome', result: metabolicSyndromeRisk },
      { category: 'stroke_risk', result: strokeRisk }
    ]

    for (const risk of risks) {
      await env.DB.prepare(`
        INSERT INTO risk_calculations (session_id, risk_category, risk_score, risk_level, 
                                      ten_year_risk, algorithm_used)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        sessionId,
        risk.category,
        risk.result.risk_score,
        risk.result.risk_level,
        risk.result.ten_year_risk,
        risk.result.algorithm_used
      ).run()
    }

    return c.json({ 
      success: true, 
      sessionId: sessionId,
      patientId: patientId,
      message: 'Comprehensive assessment completed successfully' 
    })

  } catch (error) {
    console.error('Comprehensive assessment error:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to process comprehensive assessment' 
    }, 500)
  }
})

// API endpoint to create demo assessment
app.post('/api/assessment/demo', async (c) => {
  const { env } = c
  const { country } = await c.req.json()
  
  try {
    // Medical algorithms are imported at the top
    
    // Create demo patient with unique email
    const timestamp = Date.now()
    const demoPatient = {
      full_name: 'Demo Patient Complete',
      date_of_birth: '1976-05-15', // 47 years old
      gender: 'female',
      ethnicity: 'caucasian',
      email: `demo-${timestamp}@longenixhealth.com`,
      phone: '+1 (555) 123-4567',
      country: country || 'US'
    }

    const patientResult = await env.DB.prepare(`
      INSERT INTO patients (full_name, date_of_birth, gender, ethnicity, email, phone, country)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      demoPatient.full_name,
      demoPatient.date_of_birth,
      demoPatient.gender,
      demoPatient.ethnicity,
      demoPatient.email,
      demoPatient.phone,
      demoPatient.country
    ).run()

    const patientId = patientResult.meta.last_row_id

    // Create demo session
    const sessionResult = await env.DB.prepare(`
      INSERT INTO assessment_sessions (patient_id, session_type, status)
      VALUES (?, 'demo', 'completed')
    `).bind(patientId).run()

    const sessionId = sessionResult.meta.last_row_id

    // Demo patient data with optimal biomarkers showing biological age advantage
    const patientData = {
      age: 47,
      gender: 'female' as const,
      height_cm: 165,
      weight_kg: 65,
      systolic_bp: 115,
      diastolic_bp: 75,
      biomarkers: {
        glucose: 85,               // Excellent glucose control
        hba1c: 5.1,              // Optimal diabetes risk
        total_cholesterol: 180,    // Excellent total cholesterol
        hdl_cholesterol: 65,      // High protective HDL
        ldl_cholesterol: 95,      // Optimal LDL
        triglycerides: 85,        // Excellent triglycerides
        creatinine: 0.8,          // Optimal kidney function
        egfr: 105,               // Excellent kidney function
        albumin: 4.5,            // Optimal protein status
        c_reactive_protein: 0.8,  // Low inflammation
        white_blood_cells: 6.0,   // Optimal immune function
        hemoglobin: 14.2         // Excellent oxygen transport
      }
    }

    // Calculate results - All 7 disease risk categories
    const biologicalAge = BiologicalAgeCalculator.calculateBiologicalAge(patientData)
    const ascvdRisk = DiseaseRiskCalculator.calculateASCVDRisk(patientData)
    const diabetesRisk = DiseaseRiskCalculator.calculateDiabetesRisk(patientData, {})
    const kidneyRisk = DiseaseRiskCalculator.calculateKidneyDiseaseRisk(patientData)
    const cancerRisk = DiseaseRiskCalculator.calculateCancerRisk(patientData, {})
    const cognitiveRisk = DiseaseRiskCalculator.calculateCognitiveDeclineRisk(patientData, {})
    const metabolicSyndromeRisk = DiseaseRiskCalculator.calculateMetabolicSyndromeRisk(patientData)
    const strokeRisk = DiseaseRiskCalculator.calculateStrokeRisk(patientData, {})

    // Save results to database
    await env.DB.prepare(`
      INSERT INTO biological_age (session_id, chronological_age, phenotypic_age, klemera_doubal_age, 
                                 metabolic_age, telomere_age, average_biological_age, age_advantage, calculation_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      47, // Updated chronological age
      biologicalAge.phenotypic_age,
      biologicalAge.klemera_doubal_age,
      biologicalAge.metabolic_age,
      biologicalAge.telomere_age,
      biologicalAge.average_biological_age,
      biologicalAge.age_advantage,
      'Demo: Phenotypic Age + KDM + Metabolic Age'
    ).run()

    // Save all 7 risk assessments
    const risks = [ascvdRisk, diabetesRisk, kidneyRisk, cancerRisk, cognitiveRisk, metabolicSyndromeRisk, strokeRisk]
    for (const risk of risks) {
      await env.DB.prepare(`
        INSERT INTO risk_calculations (session_id, risk_category, risk_score, risk_level, 
                                     ten_year_risk, algorithm_used)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        sessionId,
        risk.risk_category,
        risk.risk_score,
        risk.risk_level,
        risk.ten_year_risk,
        risk.algorithm_used
      ).run()
    }

    // Add comprehensive demo data for functional medicine sections
    const demoComprehensiveData = {
      // Demographics
      fullName: 'Demo Patient Complete',
      dateOfBirth: '1976-05-15',
      gender: 'female',
      
      // Functional Medicine Systems with realistic responses
      // Assimilation System
      assimilation_q1: 'rarely',
      assimilation_q2: 'yes',
      assimilation_q3: 'good',
      assimilation_q4: 'no',
      assimilation_q5: 'rarely',
      assimilation_q6: 'yes',
      
      // Biotransformation System
      biotransformation_q1: 'good',
      biotransformation_q2: 'rarely',
      biotransformation_q3: 'no',
      biotransformation_q4: 'sometimes',
      biotransformation_q5: 'yes',
      biotransformation_q6: 'rarely',
      
      // Defense & Repair System
      defense_q1: 'rarely',
      defense_q2: 'good',
      defense_q3: 'no',
      defense_q4: 'rarely',
      defense_q5: 'good',
      defense_q6: 'no',
      
      // Energy System
      energy_q1: 'good',
      energy_q2: 'rarely',
      energy_q3: 'good',
      energy_q4: 'no',
      energy_q5: 'good',
      energy_q6: 'rarely',
      
      // Transport System
      transport_q1: 'no',
      transport_q2: 'good',
      transport_q3: 'rarely',
      transport_q4: 'good',
      transport_q5: 'no',
      transport_q6: 'good',
      
      // Communication System
      communication_q1: 'good',
      communication_q2: 'rarely',
      communication_q3: 'no',
      communication_q4: 'good',
      communication_q5: 'rarely',
      communication_q6: 'good',
      
      // Structural System
      structural_q1: 'rarely',
      structural_q2: 'good',
      structural_q3: 'no',
      structural_q4: 'good',
      structural_q5: 'rarely',
      structural_q6: 'good',
      
      // Mental Health Assessment
      phq9_q1: '1',
      phq9_q2: '0',
      phq9_q3: '1',
      phq9_q4: '0',
      phq9_q5: '1',
      phq9_q6: '0',
      phq9_q7: '0',
      phq9_q8: '1',
      phq9_q9: '0',
      
      gad7_q1: '1',
      gad7_q2: '0',
      gad7_q3: '1',
      gad7_q4: '0',
      gad7_q5: '1',
      gad7_q6: '0',
      gad7_q7: '1',
      
      // Lifestyle Assessment
      exerciseFrequency: '5-6 times',
      exerciseMinutes: '46-60',
      exerciseTypes: ['cardio', 'strength', 'flexibility'],
      sleepHours: '7-8',
      sleepQuality: 'good',
      stressLevel: '2',
      stressTechniques: ['meditation', 'exercise'],
      
      // Medical History
      hasCurrentConditions: 'no',
      takingMedications: 'no',
      takingSupplements: 'yes',
      currentSupplements: 'Vitamin D3 2000 IU daily, Omega-3 fish oil 1000mg, Magnesium glycinate 400mg',
      familyHistory: ['family_heart_disease'],
      familyHistoryDetails: 'Father had heart attack at age 65, otherwise family history unremarkable',
      regularCycles: 'yes',
      pregnancies: '2',
      liveBirths: '2'
    }

    // Store comprehensive demo data
    await env.DB.prepare(`
      INSERT INTO assessment_data (session_id, data_type, json_data, created_at)
      VALUES (?, 'comprehensive_lifestyle', ?, datetime('now'))
    `).bind(
      sessionId,
      JSON.stringify(demoComprehensiveData)
    ).run()

    return c.json({
      success: true,
      sessionId,
      patientId,
      demoData: {
        patient: demoPatient,
        biologicalAge,
        risks
      },
      message: 'Demo assessment created successfully'
    })
  } catch (error) {
    console.error('Demo creation error:', error)
    return c.json({
      success: false,
      error: 'Failed to create demo assessment'
    }, 500)
  }
})

// Test API endpoint
app.get('/api/test', (c) => {
  return c.json({ 
    message: 'LongenixHealth P3 API is running',
    timestamp: new Date().toISOString() 
  })
})

// Landing page (matching demo design exactly)
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Longenix Health - Chronic Disease Risk Assessment System</title>
        
        <!-- Meta tags for SEO and social sharing -->
        <meta name="description" content="Comprehensive chronic disease risk assessment system by Dr. Graham Player, Ph.D. Advanced biological age calculation and disease risk prediction.">
        <meta name="keywords" content="chronic disease, risk assessment, biological age, longenix health, functional medicine">
        <meta name="author" content="Dr. Graham Player, Ph.D - Longenix Health">
        
        <!-- External CSS and JavaScript -->
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        
        <!-- Local CSS -->
        <link href="/css/styles.css" rel="stylesheet">
        
        <!-- Tailwind Configuration -->
        <script>
            tailwind.config = {
                theme: {
                    extend: {
                        colors: {
                            'longenix': {
                                'blue': '#1e40af',
                                'green': '#059669',
                                'red': '#dc2626',
                                'yellow': '#d97706'
                            }
                        }
                    }
                }
            }
        </script>

        <style>
            .gradient-bg {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .card-hover {
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            .card-hover:hover {
                transform: translateY(-5px);
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            }
            .hero-pattern {
                background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Authentication Modal -->
        <div id="authModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <div class="text-center mb-8">
                    <div class="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <i class="fas fa-heartbeat text-white text-2xl"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">Longenix Health</h2>
                    <p class="text-gray-600">Dynamic Risk Assessment System</p>
                    <p class="text-xs text-blue-600 mt-2">🔄 Real-time data processing | Personalized reports</p>
                </div>
                
                <form id="authForm" class="space-y-6">
                    <div>
                        <label for="systemPassword" class="block text-sm font-medium text-gray-700 mb-2">
                            System Access Code
                        </label>
                        <input type="password" id="systemPassword" required 
                               class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                               placeholder="Enter access code">
                    </div>
                    
                    <div>
                        <label for="countrySelect" class="block text-sm font-medium text-gray-700 mb-2">
                            Select Country
                        </label>
                        <select id="countrySelect" required 
                                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Choose your country</option>
                            <option value="US">United States</option>
                            <option value="Australia">Australia</option>
                            <option value="Philippines">Philippines</option>
                        </select>
                    </div>
                    
                    <button type="submit" 
                            class="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition duration-300 font-medium">
                        <i class="fas fa-unlock mr-2"></i>Access System
                    </button>
                </form>
                
                <div id="authError" class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded hidden">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    <span id="authErrorMessage">Invalid credentials</span>
                </div>
                
                <div class="mt-6 text-center text-sm text-gray-500">
                    <p><i class="fas fa-shield-alt mr-1"></i>Secure Dynamic Healthcare Assessment Platform</p>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div id="mainContent" class="hidden">
            <!-- Header -->
            <header class="gradient-bg text-white py-6 hero-pattern">
                <div class="max-w-7xl mx-auto px-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full mr-4 flex items-center justify-center">
                                <i class="fas fa-heartbeat text-2xl"></i>
                            </div>
                            <div>
                                <h1 class="text-3xl font-bold">Longenix Health</h1>
                                <p class="text-blue-100">Dynamic Risk Assessment System</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            <div class="text-sm">
                                <i class="fas fa-globe mr-2"></i>
                                <span id="selectedCountry" class="bg-white bg-opacity-20 px-3 py-1 rounded-full"></span>
                            </div>
                            <button id="logoutBtn" class="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition duration-300">
                                <i class="fas fa-sign-out-alt mr-2"></i>Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Hero Section -->
            <section class="bg-white py-16">
                <div class="max-w-7xl mx-auto px-4 text-center">
                    <h2 class="text-4xl font-bold text-gray-800 mb-6">Dynamic Health Risk Assessment</h2>
                    <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                        Real-time comprehensive analysis with personalized report generation. 
                        Your data creates YOUR unique health assessment - no more generic reports!
                    </p>
                    
                    <div class="grid md:grid-cols-3 gap-8 mt-12">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <i class="fas fa-dna text-2xl text-blue-600"></i>
                            </div>
                            <h3 class="text-xl font-semibold mb-2">Evidence-Based Algorithms</h3>
                            <p class="text-gray-600">Research-backed calculations with medical references</p>
                        </div>
                        <div class="text-center">
                            <div class="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <i class="fas fa-chart-line text-2xl text-green-600"></i>
                            </div>
                            <h3 class="text-xl font-semibold mb-2">Dynamic Processing</h3>
                            <p class="text-gray-600">Real user input creates personalized results</p>
                        </div>
                        <div class="text-center">
                            <div class="w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <i class="fas fa-clipboard-list text-2xl text-purple-600"></i>
                            </div>
                            <h3 class="text-xl font-semibold mb-2">Professional Reports</h3>
                            <p class="text-gray-600">Your data, your name, your personalized assessment</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Assessment Methods -->
            <section class="bg-gray-50 py-16">
                <div class="max-w-7xl mx-auto px-4">
                    <div class="text-center mb-12">
                        <h2 class="text-3xl font-bold text-gray-800 mb-4">Choose Your Assessment Method</h2>
                        <p class="text-lg text-gray-600">Select how you'd like to input your health data</p>
                    </div>

                    <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <!-- Comprehensive Assessment -->
                        <div class="bg-white rounded-lg shadow-lg p-8 card-hover cursor-pointer border-2 border-green-200" onclick="startAssessment('comprehensive')">
                            <div class="text-center">
                                <i class="fas fa-heartbeat text-4xl text-green-600 mb-4"></i>
                                <h3 class="text-xl font-semibold mb-3 text-green-800">Comprehensive Assessment</h3>
                                <div class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mb-3">NEW & RECOMMENDED</div>
                                <p class="text-gray-600 mb-6">Complete 12-step functional medicine assessment with real data processing</p>
                                <ul class="text-sm text-gray-500 text-left space-y-2 mb-6">
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>7 Functional Medicine Systems</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>PHQ-9 & GAD-7 Mental Health</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>Environmental Toxin Assessment</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>Comprehensive Lifestyle Analysis</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>Real Data-Driven Reports</li>
                                </ul>
                                <button class="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition duration-300">
                                    Start Full Assessment
                                </button>
                            </div>
                        </div>

                        <!-- Quick Assessment -->
                        <div class="bg-white rounded-lg shadow-lg p-8 card-hover cursor-pointer" onclick="startAssessment('manual')">
                            <div class="text-center">
                                <i class="fas fa-edit text-4xl text-blue-600 mb-4"></i>
                                <h3 class="text-xl font-semibold mb-3">Quick Assessment</h3>
                                <p class="text-gray-600 mb-6">Basic health assessment with essential biomarkers</p>
                                <ul class="text-sm text-gray-500 text-left space-y-2 mb-6">
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>Demographics & Biometrics</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>Core Lab Biomarkers</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>Basic Lifestyle Factors</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>Disease Risk Analysis</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>Biological Age Calculation</li>
                                </ul>
                                <button class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300">
                                    Quick Start
                                </button>
                            </div>
                        </div>

                        <!-- File Upload -->
                        <div class="bg-white rounded-lg shadow-lg p-8 card-hover cursor-not-allowed opacity-75">
                            <div class="text-center">
                                <i class="fas fa-upload text-4xl text-gray-400 mb-4"></i>
                                <h3 class="text-xl font-semibold mb-3 text-gray-600">Upload Lab Results</h3>
                                <p class="text-gray-500 mb-6">Coming Soon - File upload functionality</p>
                                <ul class="text-sm text-gray-400 text-left space-y-2 mb-6">
                                    <li><i class="fas fa-clock text-gray-400 mr-2"></i>PDF Lab Reports</li>
                                    <li><i class="fas fa-clock text-gray-400 mr-2"></i>CSV Data Files</li>
                                    <li><i class="fas fa-clock text-gray-400 mr-2"></i>Medical Records</li>
                                    <li><i class="fas fa-clock text-gray-400 mr-2"></i>AI Data Extraction</li>
                                </ul>
                                <button disabled class="w-full bg-gray-400 text-white py-3 px-6 rounded-lg cursor-not-allowed">
                                    Coming Soon
                                </button>
                            </div>
                        </div>

                        <!-- Load Demo Client -->
                        <div class="bg-white rounded-lg shadow-lg p-8 card-hover cursor-pointer" onclick="startAssessment('demo')">
                            <div class="text-center">
                                <i class="fas fa-user-friends text-4xl text-purple-600 mb-4"></i>
                                <h3 class="text-xl font-semibold mb-3">Load Demo Client</h3>
                                <p class="text-gray-600 mb-6">View sample assessment with realistic demo data</p>
                                <ul class="text-sm text-gray-500 text-left space-y-2 mb-6">
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>Complete Sample Data</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>Evidence-Based Calculations</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>All 10+ Report Sections</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>Personalized Results</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>Professional Formatting</li>
                                </ul>
                                <button class="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition duration-300">
                                    Load Demo
                                </button>
                            </div>
                        </div>

                        <!-- Existing Client Reports -->
                        <div class="bg-white rounded-lg shadow-lg p-8 card-hover cursor-not-allowed opacity-75">
                            <div class="text-center">
                                <i class="fas fa-folder-open text-4xl text-gray-400 mb-4"></i>
                                <h3 class="text-xl font-semibold mb-3 text-gray-600">Existing Client Reports</h3>
                                <p class="text-gray-500 mb-6">Coming Soon - Client management system</p>
                                <ul class="text-sm text-gray-400 text-left space-y-2 mb-6">
                                    <li><i class="fas fa-clock text-gray-400 mr-2"></i>Client Search by Name</li>
                                    <li><i class="fas fa-clock text-gray-400 mr-2"></i>Report History</li>
                                    <li><i class="fas fa-clock text-gray-400 mr-2"></i>Progress Tracking</li>
                                    <li><i class="fas fa-clock text-gray-400 mr-2"></i>Export & Print</li>
                                </ul>
                                <button disabled class="w-full bg-gray-400 text-white py-3 px-6 rounded-lg cursor-not-allowed">
                                    Coming Soon
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <!-- Footer -->
        <footer class="gradient-bg text-white py-12">
            <div class="max-w-7xl mx-auto px-4">
                <div class="text-center">
                    <p class="text-lg font-semibold mb-2">Dr. Graham Player, Ph.D</p>
                    <p class="text-sm text-gray-300 mb-4">Professional Healthcare Innovation Consultant – Longenix Health</p>
                    <p class="text-sm text-gray-300 mb-4">Predict • Prevent • Persist</p>
                    
                    <div class="border-t border-gray-700 pt-4 mt-6">
                        <p class="text-xs text-gray-400">
                            <strong>Medical Disclaimer:</strong> This assessment tool is for educational and informational purposes only. 
                            It is not intended to replace professional medical advice, diagnosis, or treatment. 
                            Always seek the advice of your physician or other qualified health provider with any questions 
                            you may have regarding a medical condition.
                        </p>
                    </div>
                </div>
            </div>
        </footer>

        <!-- Loading Overlay -->
        <div id="loadingOverlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden flex items-center justify-center">
            <div class="bg-white rounded-lg p-8 text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p class="text-gray-600">Processing your assessment...</p>
            </div>
        </div>

        <!-- JavaScript -->
        <script src="/js/app.js"></script>
        <script>
            // Make app instance globally available for onclick functions
            let longenixApp;
            document.addEventListener('DOMContentLoaded', () => {
                longenixApp = new LongenixAssessment();
                window.longenixApp = longenixApp;
            });
            
            // Global functions for onclick handlers
            function startAssessment(method) {
                if (window.longenixApp) {
                    window.longenixApp.startAssessment(method);
                }
            }
            
            function viewSampleReport() {
                if (window.longenixApp) {
                    window.longenixApp.viewSampleReport();
                }
            }
        </script>
    </body>
    </html>
  `)
})

export default app