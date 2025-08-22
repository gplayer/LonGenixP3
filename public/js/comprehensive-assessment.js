// Comprehensive Lifestyle Assessment Form
// Dr. Graham Player, Ph.D - Longenix Health

class ComprehensiveAssessment {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 6;
        this.formData = {};
        this.apiBase = this.getApiBase();
        
        this.init();
    }

    getApiBase() {
        if (window.location.hostname.includes('pages.dev')) {
            return '/api';
        } else if (window.location.hostname.includes('github.io')) {
            return null;
        } else {
            return '/api';
        }
    }

    init() {
        console.log('ComprehensiveAssessment initializing...');
        this.renderForm();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Navigation buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('next-step-btn')) {
                this.nextStep();
            }
            if (e.target.classList.contains('prev-step-btn')) {
                this.prevStep();
            }
            if (e.target.classList.contains('submit-assessment-btn')) {
                this.submitAssessment();
            }
        });

        // Auto-save on form changes
        document.addEventListener('change', (e) => {
            if (e.target.form && e.target.form.id === 'comprehensive-assessment-form') {
                this.saveFormData();
            }
        });
    }

    renderForm() {
        console.log('Rendering form...');
        const container = document.getElementById('assessmentContainer');
        if (!container) {
            console.error('Container not found in renderForm!');
            return;
        }
        console.log('Container found, rendering content...');

        container.innerHTML = `
            <div class="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
                <!-- Progress Header -->
                <div class="mb-8">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-2xl font-bold text-gray-800">Comprehensive Health Assessment</h2>
                        <span class="text-sm text-gray-600">Step ${this.currentStep} of ${this.totalSteps}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                             style="width: ${(this.currentStep / this.totalSteps) * 100}%"></div>
                    </div>
                    <div class="mt-2 text-sm text-gray-600">${this.getStepDescription()}</div>
                </div>

                <!-- Form Content -->
                <form id="comprehensive-assessment-form" class="space-y-6">
                    <div id="form-step-content">
                        ${this.renderStepContent()}
                    </div>

                    <!-- Navigation -->
                    <div class="flex justify-between pt-6 border-t border-gray-200">
                        <button type="button" class="prev-step-btn px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 ${this.currentStep === 1 ? 'invisible' : ''}"">
                            Previous
                        </button>
                        <div class="flex space-x-4">
                            <button type="button" class="px-4 py-2 text-gray-600 hover:text-gray-800">
                                Save & Resume Later
                            </button>
                            ${this.currentStep === this.totalSteps ? 
                                '<button type="button" class="submit-assessment-btn px-8 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Complete Assessment</button>' :
                                '<button type="button" class="next-step-btn px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Next Step</button>'
                            }
                        </div>
                    </div>
                </form>
            </div>
        `;
    }

    getStepDescription() {
        const descriptions = {
            1: 'Basic demographics, health profile, and clinical data',
            2: 'Functional Medicine systems assessment (7 core systems)',
            3: 'Mental health screening (PHQ-9 & GAD-7)',
            4: 'Detailed lifestyle factors (nutrition, exercise, sleep, stress)',
            5: 'Environmental and social factors',
            6: 'Root cause analysis (ATM framework)'
        };
        return descriptions[this.currentStep];
    }

    renderStepContent() {
        switch (this.currentStep) {
            case 1:
                return this.renderStep1_Demographics();
            case 2:
                return this.renderStep2_FunctionalMedicine();
            case 3:
                return this.renderStep3_MentalHealth();
            case 4:
                return this.renderStep4_Lifestyle();
            case 5:
                return this.renderStep5_Environmental();
            case 6:
                return this.renderStep6_RootCause();
            default:
                return '<p>Invalid step</p>';
        }
    }

    renderStep1_Demographics() {
        return `
            <div class="space-y-8">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                            <input type="text" name="fullName" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                            <input type="email" name="email" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                            <input type="date" name="dateOfBirth" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                            <select name="gender" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Select gender</option>
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Height (cm) *</label>
                            <input type="number" name="height" required min="100" max="250" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Weight (kg) *</label>
                            <input type="number" name="weight" required min="30" max="300" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Clinical Measurements</h3>
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Systolic Blood Pressure (mmHg)</label>
                            <input type="number" name="systolicBP" min="80" max="250" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Diastolic Blood Pressure (mmHg)</label>
                            <input type="number" name="diastolicBP" min="40" max="150" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Resting Heart Rate (bpm)</label>
                            <input type="number" name="heartRate" min="40" max="120" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Waist Circumference (cm)</label>
                            <input type="number" name="waistCircumference" min="50" max="200" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Recent Laboratory Results</h3>
                    <p class="text-sm text-gray-600 mb-4">Enter your most recent lab values (leave blank if not tested)</p>
                    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${this.renderBiomarkerInputs()}
                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Medical History</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Current Medications</label>
                            <textarea name="currentMedications" rows="3" placeholder="List all current medications, supplements, and dosages" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Known Health Conditions</label>
                            <textarea name="healthConditions" rows="3" placeholder="List any diagnosed health conditions or chronic issues" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Family Health History</label>
                            <textarea name="familyHistory" rows="3" placeholder="Notable family health conditions (heart disease, diabetes, cancer, etc.)" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderBiomarkerInputs() {
        const biomarkers = [
            { name: 'glucose', label: 'Fasting Glucose (mg/dL)', min: 60, max: 400 },
            { name: 'hba1c', label: 'HbA1c (%)', min: 3, max: 15, step: 0.1 },
            { name: 'totalCholesterol', label: 'Total Cholesterol (mg/dL)', min: 100, max: 400 },
            { name: 'hdlCholesterol', label: 'HDL Cholesterol (mg/dL)', min: 20, max: 100 },
            { name: 'ldlCholesterol', label: 'LDL Cholesterol (mg/dL)', min: 50, max: 300 },
            { name: 'triglycerides', label: 'Triglycerides (mg/dL)', min: 30, max: 1000 },
            { name: 'creatinine', label: 'Creatinine (mg/dL)', min: 0.3, max: 5, step: 0.1 },
            { name: 'albumin', label: 'Albumin (g/dL)', min: 2, max: 6, step: 0.1 },
            { name: 'crp', label: 'C-Reactive Protein (mg/L)', min: 0.1, max: 50, step: 0.1 }
        ];

        return biomarkers.map(bio => `
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">${bio.label}</label>
                <input type="number" 
                       name="${bio.name}" 
                       min="${bio.min}" 
                       max="${bio.max}"
                       ${bio.step ? `step="${bio.step}"` : ''}
                       placeholder="Enter value"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
        `).join('');
    }

    renderStep2_FunctionalMedicine() {
        return `
            <div class="space-y-8">
                <div class="text-center mb-6">
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">Functional Medicine Systems Assessment</h3>
                    <p class="text-gray-600">Rate your symptoms and experiences for each of the 7 core functional medicine systems</p>
                </div>

                ${this.renderFunctionalMedicineSystems()}
            </div>
        `;
    }

    renderFunctionalMedicineSystems() {
        const systems = [
            {
                id: 'assimilation',
                name: 'Assimilation System',
                description: 'Digestion, absorption, and nutrient processing',
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
                description: 'Detoxification, liver function, and waste elimination',
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
                description: 'Immune function, inflammation, and healing',
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
                description: 'Musculoskeletal health, posture, and physical stability',
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
                description: 'Hormones, neurotransmitters, and signaling',
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
                description: 'Cellular energy production and metabolism',
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
                description: 'Circulation, cardiovascular, and lymphatic systems',
                questions: [
                    'Do you have good circulation (warm hands/feet)?',
                    'How is your cardiovascular fitness?',
                    'Do you experience swelling or fluid retention?',
                    'How well do you tolerate physical activity?',
                    'Do you have any heart-related symptoms?',
                    'How would you rate your overall circulation?'
                ]
            }
        ];

        return systems.map(system => `
            <div class="bg-gray-50 rounded-lg p-6">
                <div class="mb-4">
                    <h4 class="text-lg font-semibold text-gray-800">${system.name}</h4>
                    <p class="text-sm text-gray-600">${system.description}</p>
                </div>
                <div class="space-y-4">
                    ${system.questions.map((question, index) => `
                        <div class="bg-white rounded-md p-4">
                            <label class="block text-sm font-medium text-gray-700 mb-3">${question}</label>
                            <div class="flex space-x-4">
                                ${[
                                    { value: 1, label: 'Poor', color: 'red' },
                                    { value: 2, label: 'Fair', color: 'orange' },
                                    { value: 3, label: 'Good', color: 'yellow' },
                                    { value: 4, label: 'Very Good', color: 'green' },
                                    { value: 5, label: 'Excellent', color: 'emerald' }
                                ].map(option => `
                                    <label class="flex items-center">
                                        <input type="radio" 
                                               name="${system.id}_q${index + 1}" 
                                               value="${option.value}" 
                                               class="sr-only">
                                        <div class="w-12 h-8 rounded-md border-2 border-gray-300 flex items-center justify-center cursor-pointer transition-all hover:border-${option.color}-400 peer-checked:bg-${option.color}-500 peer-checked:border-${option.color}-500 peer-checked:text-white">
                                            <span class="text-xs font-medium">${option.value}</span>
                                        </div>
                                        <span class="ml-2 text-xs text-gray-600">${option.label}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    renderStep3_MentalHealth() {
        return `
            <div class="space-y-8">
                <div class="text-center mb-6">
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">Mental Health Screening</h3>
                    <p class="text-gray-600">Standardized assessments for depression (PHQ-9) and anxiety (GAD-7)</p>
                </div>

                <!-- PHQ-9 Depression Screening -->
                <div class="bg-blue-50 rounded-lg p-6">
                    <h4 class="text-lg font-semibold text-blue-800 mb-4">PHQ-9 Depression Screening</h4>
                    <p class="text-sm text-blue-700 mb-6">Over the last 2 weeks, how often have you been bothered by any of the following problems?</p>
                    
                    ${this.renderPHQ9Questions()}
                </div>

                <!-- GAD-7 Anxiety Screening -->
                <div class="bg-purple-50 rounded-lg p-6">
                    <h4 class="text-lg font-semibold text-purple-800 mb-4">GAD-7 Anxiety Screening</h4>
                    <p class="text-sm text-purple-700 mb-6">Over the last 2 weeks, how often have you been bothered by the following problems?</p>
                    
                    ${this.renderGAD7Questions()}
                </div>
            </div>
        `;
    }

    renderPHQ9Questions() {
        const questions = [
            'Little interest or pleasure in doing things',
            'Feeling down, depressed, or hopeless',
            'Trouble falling or staying asleep, or sleeping too much',
            'Feeling tired or having little energy',
            'Poor appetite or overeating',
            'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
            'Trouble concentrating on things, such as reading the newspaper or watching television',
            'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
            'Thoughts that you would be better off dead or of hurting yourself in some way'
        ];

        const options = [
            { value: 0, label: 'Not at all' },
            { value: 1, label: 'Several days' },
            { value: 2, label: 'More than half the days' },
            { value: 3, label: 'Nearly every day' }
        ];

        return questions.map((question, index) => `
            <div class="bg-white rounded-md p-4 mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-3">${index + 1}. ${question}</label>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                    ${options.map(option => `
                        <label class="flex items-center p-2 rounded border cursor-pointer hover:bg-gray-50">
                            <input type="radio" name="phq9_q${index + 1}" value="${option.value}" class="mr-2">
                            <span class="text-sm">${option.label} (${option.value})</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    renderGAD7Questions() {
        const questions = [
            'Feeling nervous, anxious or on edge',
            'Not being able to stop or control worrying',
            'Worrying too much about different things',
            'Trouble relaxing',
            'Being so restless that it is hard to sit still',
            'Becoming easily annoyed or irritable',
            'Feeling afraid as if something awful might happen'
        ];

        const options = [
            { value: 0, label: 'Not at all' },
            { value: 1, label: 'Several days' },
            { value: 2, label: 'More than half the days' },
            { value: 3, label: 'Nearly every day' }
        ];

        return questions.map((question, index) => `
            <div class="bg-white rounded-md p-4 mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-3">${index + 1}. ${question}</label>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                    ${options.map(option => `
                        <label class="flex items-center p-2 rounded border cursor-pointer hover:bg-gray-50">
                            <input type="radio" name="gad7_q${index + 1}" value="${option.value}" class="mr-2">
                            <span class="text-sm">${option.label} (${option.value})</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    renderStep4_Lifestyle() {
        return `
            <div class="space-y-8">
                <div class="text-center mb-6">
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">Detailed Lifestyle Assessment</h3>
                    <p class="text-gray-600">Comprehensive evaluation of nutrition, exercise, sleep, and stress management</p>
                </div>

                ${this.renderLifestyleSections()}
            </div>
        `;
    }

    renderLifestyleSections() {
        // This would be a very long implementation
        // For now, I'll create a structure and key questions
        return `
            <!-- Nutrition Assessment -->
            <div class="bg-green-50 rounded-lg p-6">
                <h4 class="text-lg font-semibold text-green-800 mb-4">Nutrition & Hydration</h4>
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">How many servings of vegetables do you eat daily?</label>
                        <select name="vegetableServings" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                            <option value="">Select...</option>
                            <option value="0-1">0-1 servings</option>
                            <option value="2-3">2-3 servings</option>
                            <option value="4-5">4-5 servings</option>
                            <option value="6+">6+ servings</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">How many glasses of water do you drink daily?</label>
                        <select name="waterIntake" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                            <option value="">Select...</option>
                            <option value="1-3">1-3 glasses</option>
                            <option value="4-6">4-6 glasses</option>
                            <option value="7-8">7-8 glasses</option>
                            <option value="9+">9+ glasses</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Exercise Assessment -->
            <div class="bg-blue-50 rounded-lg p-6">
                <h4 class="text-lg font-semibold text-blue-800 mb-4">Physical Activity</h4>
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">How many days per week do you exercise?</label>
                        <select name="exerciseFrequency" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                            <option value="">Select...</option>
                            <option value="0">0 days</option>
                            <option value="1-2">1-2 days</option>
                            <option value="3-4">3-4 days</option>
                            <option value="5+">5+ days</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">What types of exercise do you regularly do?</label>
                        <div class="space-y-2">
                            <label class="flex items-center">
                                <input type="checkbox" name="exerciseTypes" value="cardio" class="mr-2">
                                <span class="text-sm">Cardio/Aerobic</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="exerciseTypes" value="strength" class="mr-2">
                                <span class="text-sm">Strength Training</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="exerciseTypes" value="flexibility" class="mr-2">
                                <span class="text-sm">Flexibility/Yoga</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sleep Assessment -->
            <div class="bg-purple-50 rounded-lg p-6">
                <h4 class="text-lg font-semibold text-purple-800 mb-4">Sleep Quality</h4>
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Average hours of sleep per night</label>
                        <select name="sleepHours" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                            <option value="">Select...</option>
                            <option value="<5">Less than 5 hours</option>
                            <option value="5-6">5-6 hours</option>
                            <option value="7-8">7-8 hours</option>
                            <option value="9+">9+ hours</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">How would you rate your sleep quality?</label>
                        <select name="sleepQuality" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                            <option value="">Select...</option>
                            <option value="poor">Poor</option>
                            <option value="fair">Fair</option>
                            <option value="good">Good</option>
                            <option value="excellent">Excellent</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Stress Management -->
            <div class="bg-red-50 rounded-lg p-6">
                <h4 class="text-lg font-semibold text-red-800 mb-4">Stress Management</h4>
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">How would you rate your current stress level?</label>
                        <select name="stressLevel" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                            <option value="">Select...</option>
                            <option value="1">Very Low (1)</option>
                            <option value="2">Low (2)</option>
                            <option value="3">Moderate (3)</option>
                            <option value="4">High (4)</option>
                            <option value="5">Very High (5)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Do you practice stress management techniques?</label>
                        <div class="space-y-2">
                            <label class="flex items-center">
                                <input type="checkbox" name="stressTechniques" value="meditation" class="mr-2">
                                <span class="text-sm">Meditation/Mindfulness</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="stressTechniques" value="exercise" class="mr-2">
                                <span class="text-sm">Exercise</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="stressTechniques" value="social" class="mr-2">
                                <span class="text-sm">Social Support</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderStep5_Environmental() {
        return `
            <div class="space-y-8">
                <div class="text-center mb-6">
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">Environmental & Social Factors</h3>
                    <p class="text-gray-600">Assessment of environmental exposures and social connections</p>
                </div>

                <!-- Environmental Exposures -->
                <div class="bg-yellow-50 rounded-lg p-6">
                    <h4 class="text-lg font-semibold text-yellow-800 mb-4">Environmental Exposures</h4>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Do you filter your drinking water?</label>
                            <select name="waterFiltered" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="">Select...</option>
                                <option value="yes">Yes, regularly</option>
                                <option value="sometimes">Sometimes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">How would you rate the air quality where you live?</label>
                            <select name="airQuality" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="">Select...</option>
                                <option value="excellent">Excellent</option>
                                <option value="good">Good</option>
                                <option value="fair">Fair</option>
                                <option value="poor">Poor</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Social Connections -->
                <div class="bg-pink-50 rounded-lg p-6">
                    <h4 class="text-lg font-semibold text-pink-800 mb-4">Social Connections</h4>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">How satisfied are you with your social relationships?</label>
                            <select name="socialSatisfaction" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="">Select...</option>
                                <option value="very-satisfied">Very Satisfied</option>
                                <option value="satisfied">Satisfied</option>
                                <option value="neutral">Neutral</option>
                                <option value="dissatisfied">Dissatisfied</option>
                                <option value="very-dissatisfied">Very Dissatisfied</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">How often do you spend time in nature?</label>
                            <select name="natureTime" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="">Select...</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="rarely">Rarely</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderStep6_RootCause() {
        return `
            <div class="space-y-8">
                <div class="text-center mb-6">
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">Root Cause Analysis (ATM Framework)</h3>
                    <p class="text-gray-600">Understanding the underlying factors contributing to your current health status</p>
                </div>

                <!-- Antecedents -->
                <div class="bg-blue-50 rounded-lg p-6">
                    <h4 class="text-lg font-semibold text-blue-800 mb-4">Antecedents (Predisposing Factors)</h4>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Did you experience significant stress or trauma in early life?</label>
                            <select name="earlyStress" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="">Select...</option>
                                <option value="yes-significant">Yes, significant</option>
                                <option value="yes-moderate">Yes, moderate</option>
                                <option value="minimal">Minimal</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Do you have known genetic predispositions to health conditions?</label>
                            <textarea name="geneticPredispositions" rows="3" placeholder="Describe any known genetic factors or strong family history" class="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                        </div>
                    </div>
                </div>

                <!-- Triggers -->
                <div class="bg-red-50 rounded-lg p-6">
                    <h4 class="text-lg font-semibold text-red-800 mb-4">Triggers (Initiating Events)</h4>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Have you experienced any major life stressors in the past 2 years?</label>
                            <textarea name="recentStressors" rows="3" placeholder="Job loss, divorce, death of loved one, major illness, etc." class="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">When did you first notice your current health concerns?</label>
                            <input type="text" name="symptomOnset" placeholder="Approximate timeframe or triggering event" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                        </div>
                    </div>
                </div>

                <!-- Mediators -->
                <div class="bg-green-50 rounded-lg p-6">
                    <h4 class="text-lg font-semibold text-green-800 mb-4">Mediators/Perpetuators (Ongoing Factors)</h4>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">What ongoing factors might be affecting your health?</label>
                            <textarea name="ongoingFactors" rows="3" placeholder="Chronic stress, poor sleep, environmental exposures, etc." class="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">What barriers prevent you from optimal health?</label>
                            <textarea name="healthBarriers" rows="3" placeholder="Time constraints, financial limitations, lack of knowledge, etc." class="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.saveFormData();
            if (this.currentStep < this.totalSteps) {
                this.currentStep++;
                this.renderForm();
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.renderForm();
        }
    }

    validateCurrentStep() {
        const form = document.getElementById('comprehensive-assessment-form');
        if (!form) return false;

        // Check required fields for current step
        const requiredFields = form.querySelectorAll('input[required], select[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('border-red-500');
                isValid = false;
            } else {
                field.classList.remove('border-red-500');
            }
        });

        if (!isValid) {
            alert('Please fill in all required fields before proceeding.');
        }

        return isValid;
    }

    saveFormData() {
        const form = document.getElementById('comprehensive-assessment-form');
        if (!form) return;

        const formData = new FormData(form);
        const data = {};

        // Process form data
        for (let [key, value] of formData.entries()) {
            if (data[key]) {
                // Handle multiple values (checkboxes)
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }

        // Merge with existing form data
        this.formData = { ...this.formData, ...data };

        // Save to localStorage for persistence
        localStorage.setItem('comprehensive_assessment_data', JSON.stringify(this.formData));
    }

    async submitAssessment() {
        if (!this.validateCurrentStep()) {
            return;
        }

        this.saveFormData();

        if (!this.apiBase) {
            alert('Assessment submission is not available in demo mode.');
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/assessment/comprehensive`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.formData)
            });

            const result = await response.json();

            if (result.success) {
                // Redirect to report
                window.location.href = `/report?sessionId=${result.sessionId}`;
            } else {
                alert('Assessment submission failed: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('Assessment submission failed. Please try again.');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking authentication...');
    
    // Check authentication status
    const savedAuth = sessionStorage.getItem('longenix_auth');
    if (!savedAuth) {
        console.log('Not authenticated, redirecting to home...');
        alert('Please authenticate first from the main page.');
        window.location.href = '/';
        return;
    }
    
    console.log('Authenticated, looking for assessmentContainer...');
    const container = document.getElementById('assessmentContainer');
    if (container) {
        console.log('Found assessmentContainer, initializing ComprehensiveAssessment...');
        new ComprehensiveAssessment();
    } else {
        console.error('assessmentContainer not found!');
        container.innerHTML = '<div class="text-center p-8 text-red-600">Error: Assessment container not found</div>';
    }
});