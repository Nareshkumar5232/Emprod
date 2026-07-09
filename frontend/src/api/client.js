// src/api/client.js
import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.DEV ? 'http://127.0.0.1:8000' : '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

client.interceptors.request.use(config => {
  // Inject GitHub Token if available
  const gitHubToken = localStorage.getItem('github_token');
  if (gitHubToken && gitHubToken.trim() && gitHubToken !== 'undefined') {
    config.headers['X-GitHub-Token'] = gitHubToken.trim();
  }
  
  // Inject JWT Auth Token if available
  const authToken = localStorage.getItem('auth_token');
  if (authToken && authToken.trim() && authToken !== 'undefined') {
    config.headers['Authorization'] = `Bearer ${authToken.trim()}`;
  }
  
  return config;
}, error => {
  return Promise.reject(error);
});

export default client;

// ── API helpers ────────────────────────────────────────────────────
export const api = {
  // Authentication
  login:               (data)  => client.post('/auth/login', data),
  register:            (data)  => client.post('/auth/register', data),

  // Machine Learning Predictor
  predict:             (data)  => client.post('/predict', data),
  getStats:            ()      => client.get('/stats'),
  getHistory:          ()      => client.get('/history'),
  getRecent:           ()      => client.get('/recent'),
  clearHistory:        ()      => client.delete('/history'),

  // Repository Analyzer
  analyzeRepo:         (data)  => client.post('/analyze-repo', data),
  getTeamRanking:      (data)  => client.post('/team-ranking', data),
  getRepositoryHealth: (data)  => client.post('/repository-health', data),
  getRecommendations:  (data)  => client.post('/recommendations', data),
  getTopPerformer:     (data)  => client.post('/top-performer', data),
  getRiskDetection:    (data)  => client.post('/risk-analysis', data), // mapped to POST /risk-analysis
  getAnalysisDetails:  (id)    => client.get(`/analysis/${id}`),
  deleteAnalysis:      (id)    => client.delete(`/analysis/${id}`),
  
  // Custom Detail Pages
  getContributorDetails: (username) => client.get(`/contributors/${username}`),
  getRepositories:     ()      => client.get('/repositories'),

  // Drift Detection & MLOps
  getDriftReport:      ()      => client.get('/drift-detection'),
  triggerRetraining:   ()      => client.post('/retrain'),
};
