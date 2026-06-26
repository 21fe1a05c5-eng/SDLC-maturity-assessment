import 'dotenv/config';

const BASE_URL = 'http://localhost:3001';

async function runTests() {
  console.log('🧪 Starting API End-to-End Test Suite...');
  
  let userToken = '';
  let adminToken = '';
  let testUserId = '';
  const testEmail = `testuser_${Math.random().toString(36).substring(2, 9)}@example.com`;
  const testPassword = 'password123';

  // Helper helper to make requests
  async function makeRequest(path, method = 'GET', body = null, token = null) {
    const url = `${BASE_URL}${path}`;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const options = {
      method,
      headers,
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { status: res.status, data };
  }

  // 1. SIGNUP
  console.log('\n📝 1. Testing POST /api/auth/signup...');
  const signupRes = await makeRequest('/api/auth/signup', 'POST', {
    email: testEmail,
    password: testPassword,
  });
  if (signupRes.status === 201 && signupRes.data.token) {
    console.log('✅ Signup successful!');
    userToken = signupRes.data.token;
    testUserId = signupRes.data.user.id;
  } else {
    throw new Error(`Signup failed: ${JSON.stringify(signupRes)}`);
  }

  // 2. ME (User)
  console.log('\n👤 2. Testing GET /api/auth/me (User)...');
  const meRes = await makeRequest('/api/auth/me', 'GET', null, userToken);
  if (meRes.status === 200 && meRes.data.user && meRes.data.user.email === testEmail) {
    console.log(`✅ Auth check successful! Logged in as: ${meRes.data.user.email}`);
  } else {
    throw new Error(`Auth check failed: ${JSON.stringify(meRes)}`);
  }

  // 3. PROFILE UPDATE
  console.log('\n🔄 3. Testing POST /api/users/profile...');
  const profileRes = await makeRequest('/api/users/profile', 'POST', {
    name: 'Test Name',
    gender: 'Other',
  }, userToken);
  if (profileRes.status === 200 && profileRes.data.user.name === 'Test Name') {
    console.log('✅ Profile updated successfully!');
  } else {
    throw new Error(`Profile update failed: ${JSON.stringify(profileRes)}`);
  }

  // 4. LOGIN (Admin)
  console.log('\n🔑 4. Testing POST /api/auth/login (Admin Bootstrap)...');
  const loginAdminRes = await makeRequest('/api/auth/login', 'POST', {
    email: 'admin@sdlc.com',
    password: 'admin123',
  });
  if (loginAdminRes.status === 200 && loginAdminRes.data.token) {
    console.log('✅ Admin login successful!');
    adminToken = loginAdminRes.data.token;
  } else {
    throw new Error(`Admin login failed: ${JSON.stringify(loginAdminRes)}`);
  }

  // 5. GET USERS (Admin only)
  console.log('\n📊 5. Testing GET /api/users (Admin)...');
  const usersRes = await makeRequest('/api/users', 'GET', null, adminToken);
  if (usersRes.status === 200 && Array.isArray(usersRes.data.users)) {
    console.log(`✅ Fetched users list successfully. Total users: ${usersRes.data.users.length}`);
  } else {
    throw new Error(`Get users failed: ${JSON.stringify(usersRes)}`);
  }

  // 6. GET/POST SETTINGS (Admin only)
  console.log('\n⚙️  6. Testing GET and POST /api/settings...');
  const getSettingsRes = await makeRequest('/api/settings', 'GET', null, adminToken);
  if (getSettingsRes.status === 200 && getSettingsRes.data.settings) {
    console.log('✅ Fetched settings successfully.');
    
    // Save settings (update ollamaModel to test update functionality)
    const currentSettings = getSettingsRes.data.settings;
    currentSettings.ollamaModel = 'llama3.2';
    const postSettingsRes = await makeRequest('/api/settings', 'POST', currentSettings, adminToken);
    if (postSettingsRes.status === 200 && postSettingsRes.data.settings.ollamaModel === 'llama3.2') {
      console.log('✅ Saved settings successfully.');
    } else {
      throw new Error(`Save settings failed: ${JSON.stringify(postSettingsRes)}`);
    }
  } else {
    throw new Error(`Fetch settings failed: ${JSON.stringify(getSettingsRes)}`);
  }

  // 7. QUESTIONS CRUD & DUPLICATE CONFLICT
  console.log('\n📝 7. Testing Questions CRUD & Duplicate Handling...');
  // Fetch questions
  const getQuestionsRes = await makeRequest('/api/questions', 'GET');
  if (getQuestionsRes.status === 200 && Array.isArray(getQuestionsRes.data.questions)) {
    console.log(`✅ Fetched questions successfully. Total: ${getQuestionsRes.data.questions.length}`);
  } else {
    throw new Error(`Fetch questions failed: ${JSON.stringify(getQuestionsRes)}`);
  }

  // Create temporary question
  const tempQuestion = {
    area: 'Requirements',
    subArea: `SubArea_${Math.random().toString(36).substring(2, 9)}`,
    practice: `Practice_${Math.random().toString(36).substring(2, 9)}`,
    type: 'extent',
    questionText: 'Is this an automated test question?',
  };

  const createQuestionRes = await makeRequest('/api/questions', 'POST', tempQuestion, adminToken);
  if (createQuestionRes.status === 200) {
    console.log('✅ Created temporary question successfully.');
  } else {
    throw new Error(`Create question failed: ${JSON.stringify(createQuestionRes)}`);
  }

  // Duplicate question check (should yield 409 conflict)
  const duplicateQuestionRes = await makeRequest('/api/questions', 'POST', tempQuestion, adminToken);
  if (duplicateQuestionRes.status === 409) {
    console.log('✅ Successfully caught duplicate question constraint (409 Conflict).');
  } else {
    throw new Error(`Duplicate question allowed or failed with wrong status: ${JSON.stringify(duplicateQuestionRes)}`);
  }

  // Find and delete the created question
  const updatedQuestionsRes = await makeRequest('/api/questions', 'GET');
  const createdQ = updatedQuestionsRes.data.questions.find(
    (q) => q.area === tempQuestion.area && q.subArea === tempQuestion.subArea && q.practice === tempQuestion.practice
  );
  if (createdQ) {
    const deleteRes = await makeRequest(`/api/questions/${createdQ.id}`, 'DELETE', null, adminToken);
    if (deleteRes.status === 200) {
      console.log(`✅ Deleted temporary question (ID: ${createdQ.id}) successfully.`);
    } else {
      throw new Error(`Delete question failed: ${JSON.stringify(deleteRes)}`);
    }
  } else {
    throw new Error('Could not find the created temporary question in the questions list.');
  }

  // 8. ASSESSMENT CRUD
  console.log('\n📝 8. Testing Assessment CRUD...');
  const testAssessment = {
    projectName: 'E2E Testing Project',
    answers: {
      '1': { level: 2, comments: 'Good baseline' },
      '2': { level: 4, comments: 'Automated' },
    },
    scores: {
      Requirements: 3.0,
      Architecture: 2.5,
      Development: 4.0,
      Testing: 1.5,
      Deployment: 3.5,
    },
    overallScore: 60,
  };

  const saveAssessmentRes = await makeRequest('/api/assessments', 'POST', testAssessment, userToken);
  let savedAssessmentId = '';
  if (saveAssessmentRes.status === 200 && saveAssessmentRes.data.assessment) {
    savedAssessmentId = saveAssessmentRes.data.assessment.id;
    console.log(`✅ Assessment saved successfully! ID: ${savedAssessmentId}`);
  } else {
    throw new Error(`Save assessment failed: ${JSON.stringify(saveAssessmentRes)}`);
  }

  // Fetch assessments list
  const getAssessmentsRes = await makeRequest('/api/assessments', 'GET', null, userToken);
  if (getAssessmentsRes.status === 200 && Array.isArray(getAssessmentsRes.data.assessments)) {
    console.log(`✅ Fetched assessments list. Found: ${getAssessmentsRes.data.assessments.length}`);
  } else {
    throw new Error(`Fetch assessments list failed: ${JSON.stringify(getAssessmentsRes)}`);
  }

  // Fetch assessment by ID
  const getAssessmentByIdRes = await makeRequest(`/api/assessments/${savedAssessmentId}`, 'GET', null, userToken);
  if (getAssessmentByIdRes.status === 200 && getAssessmentByIdRes.data.assessment) {
    console.log('✅ Fetched specific assessment successfully.');
  } else {
    throw new Error(`Fetch assessment by ID failed: ${JSON.stringify(getAssessmentByIdRes)}`);
  }

  // Patch assessment remarks
  const patchAssessmentRes = await makeRequest(`/api/assessments/${savedAssessmentId}`, 'PATCH', {
    remarks: 'Approved by automated pipeline.',
    provider: 'testing-script',
  }, userToken);
  if (patchAssessmentRes.status === 200 && patchAssessmentRes.data.assessment.remarks.includes('Approved')) {
    console.log('✅ Assessment remarks patched successfully.');
  } else {
    throw new Error(`Patch assessment remarks failed: ${JSON.stringify(patchAssessmentRes)}`);
  }

  // 9. REMARKS GENERATION (AI Provider engine fallback)
  console.log('\n🤖 9. Testing POST /api/remarks...');
  const remarksRes = await makeRequest('/api/remarks', 'POST', {
    scores: testAssessment.scores,
    answers: testAssessment.answers,
  });
  if (remarksRes.status === 200 && remarksRes.data.remarks) {
    console.log(`✅ Remarks generated successfully (Provider: ${remarksRes.data.provider})!`);
  } else {
    throw new Error(`Generate remarks failed: ${JSON.stringify(remarksRes)}`);
  }

  // 10. FEEDBACK
  console.log('\n💬 10. Testing Feedback Submission & Fetching...');
  const testFeedback = {
    assessmentId: savedAssessmentId,
    rating: 5,
    comments: 'Super helpful maturity report!',
  };
  const postFeedbackRes = await makeRequest('/api/feedback', 'POST', testFeedback, userToken);
  if (postFeedbackRes.status === 200 && postFeedbackRes.data.feedback) {
    console.log('✅ Feedback submitted successfully.');
  } else {
    throw new Error(`Submit feedback failed: ${JSON.stringify(postFeedbackRes)}`);
  }

  // Admin read feedback list
  const getFeedbackRes = await makeRequest('/api/feedback', 'GET', null, adminToken);
  if (getFeedbackRes.status === 200 && Array.isArray(getFeedbackRes.data.feedback)) {
    console.log(`✅ Admin retrieved feedback list. Total count: ${getFeedbackRes.data.feedback.length}`);
  } else {
    throw new Error(`Admin fetch feedback failed: ${JSON.stringify(getFeedbackRes)}`);
  }

  // 11. LOGOUT
  console.log('\n🚪 11. Testing POST /api/auth/logout...');
  const logoutRes = await makeRequest('/api/auth/logout', 'POST');
  if (logoutRes.status === 200) {
    console.log('✅ Logged out successfully.');
  } else {
    throw new Error(`Logout failed: ${JSON.stringify(logoutRes)}`);
  }

  console.log('\n🎉 ALL ENDPOINTS VERIFIED SUCCESSFULLY! 🚀');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message || err);
  process.exit(1);
});
