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

    // Calculate age from date of birth
    const birthDate = new Date(session.date_of_birth)
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))

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

              <!-- Section 2: Risk Assessment Results -->
              ${risks.results && risks.results.length > 0 ? `
              <div class="report-section">
                  <div class="report-header">
                      <i class="fas fa-exclamation-triangle"></i>
                      <h2>2. Disease Risk Assessment</h2>
                  </div>
                  <div class="report-content">
                      <div class="grid md:grid-cols-2 gap-6">
                          ${risks.results.map(risk => `
                              <div class="border rounded-lg p-6">
                                  <h3 class="text-lg font-semibold mb-3">${risk.risk_category.replace('_', ' ').replace(/\\b\\w/g, l => l.toUpperCase())} Risk</h3>
                                  <div class="flex items-center justify-between mb-4">
                                      <span class="risk-${risk.risk_level}">${risk.risk_level.toUpperCase()}</span>
                                      <span class="text-2xl font-bold">${risk.ten_year_risk.toFixed(1)}%</span>
                                  </div>
                                  <p class="text-sm text-gray-600 mb-2">10-year risk estimate</p>
                                  <p class="text-xs text-gray-500">Algorithm: ${risk.algorithm_used}</p>
                              </div>
                          `).join('')}
                      </div>
                  </div>
              </div>` : ''}

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
        glucose: parseFloat(assessmentData.glucose) || null,
        hba1c: parseFloat(assessmentData.hba1c) || null,
        total_cholesterol: parseFloat(assessmentData.totalCholesterol) || null,
        hdl_cholesterol: parseFloat(assessmentData.hdlCholesterol) || null,
        ldl_cholesterol: parseFloat(assessmentData.ldlCholesterol) || null,
        triglycerides: parseFloat(assessmentData.triglycerides) || null,
        creatinine: parseFloat(assessmentData.creatinine) || null,
        egfr: parseFloat(assessmentData.egfr) || null,
        albumin: parseFloat(assessmentData.albumin) || null,
        c_reactive_protein: parseFloat(assessmentData.cReactiveProtein) || null,
        // Add more biomarkers as needed
      }
    }

    // Calculate biological age
    const biologicalAge = BiologicalAgeCalculator.calculateBiologicalAge(patientData)

    // Calculate disease risks
    const ascvdRisk = DiseaseRiskCalculator.calculateASCVDRisk(patientData)
    const diabetesRisk = DiseaseRiskCalculator.calculateDiabetesRisk(patientData, assessmentData.lifestyle || {})
    const kidneyRisk = DiseaseRiskCalculator.calculateKidneyDiseaseRisk(patientData)

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

    // Save risk assessments
    const risks = [ascvdRisk, diabetesRisk, kidneyRisk]
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

// API endpoint to create demo assessment
app.post('/api/assessment/demo', async (c) => {
  const { env } = c
  const { country } = await c.req.json()
  
  try {
    // Medical algorithms are imported at the top
    
    // Create demo patient
    const demoPatient = {
      full_name: 'Demo Patient',
      date_of_birth: '1978-05-15', // 45 years old
      gender: 'female',
      ethnicity: 'caucasian',
      email: 'demo@longenixhealth.com',
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

    // Demo patient data with realistic biomarkers
    const patientData = {
      age: 45,
      gender: 'female' as const,
      height_cm: 165,
      weight_kg: 68,
      systolic_bp: 125,
      diastolic_bp: 78,
      biomarkers: {
        glucose: 92,
        hba1c: 5.4,
        total_cholesterol: 195,
        hdl_cholesterol: 58,
        ldl_cholesterol: 115,
        triglycerides: 110,
        creatinine: 0.9,
        egfr: 95,
        albumin: 4.1,
        c_reactive_protein: 1.2,
        white_blood_cells: 6.5,
        hemoglobin: 13.8
      }
    }

    // Calculate results
    const biologicalAge = BiologicalAgeCalculator.calculateBiologicalAge(patientData)
    const ascvdRisk = DiseaseRiskCalculator.calculateASCVDRisk(patientData)
    const diabetesRisk = DiseaseRiskCalculator.calculateDiabetesRisk(patientData)
    const kidneyRisk = DiseaseRiskCalculator.calculateKidneyDiseaseRisk(patientData)

    // Save results to database
    await env.DB.prepare(`
      INSERT INTO biological_age (session_id, chronological_age, phenotypic_age, klemera_doubal_age, 
                                 metabolic_age, telomere_age, average_biological_age, age_advantage, calculation_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      patientData.age,
      biologicalAge.phenotypic_age,
      biologicalAge.klemera_doubal_age,
      biologicalAge.metabolic_age,
      biologicalAge.telomere_age,
      biologicalAge.average_biological_age,
      biologicalAge.age_advantage,
      'Demo: Phenotypic Age + KDM + Metabolic Age'
    ).run()

    const risks = [ascvdRisk, diabetesRisk, kidneyRisk]
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
                        <!-- Manual Entry -->
                        <div class="bg-white rounded-lg shadow-lg p-8 card-hover cursor-pointer" onclick="startAssessment('manual')">
                            <div class="text-center">
                                <i class="fas fa-edit text-4xl text-blue-600 mb-4"></i>
                                <h3 class="text-xl font-semibold mb-3">Manual Data Entry</h3>
                                <p class="text-gray-600 mb-6">Complete the comprehensive health assessment form step by step</p>
                                <ul class="text-sm text-gray-500 text-left space-y-2 mb-6">
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>Demographics & Biometrics</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>60+ Lab Biomarkers</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>Family History (3 generations)</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>ATM Timeline</li>
                                    <li><i class="fas fa-check text-green-500 mr-2"></i>Mental Health Screening</li>
                                </ul>
                                <button class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300">
                                    Start Assessment
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