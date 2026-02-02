/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AITools from './pages/AITools';
import AdminCohortOverview from './pages/AdminCohortOverview';
import AdminCohorts from './pages/AdminCohorts';
import AdminDashboard from './pages/AdminDashboard';
import AdminExamBankImport from './pages/AdminExamBankImport';
import AdminExamDetail from './pages/AdminExamDetail';
import AdminExams from './pages/AdminExams';
import AdminOverview from './pages/AdminOverview';
import AdminPortfolio from './pages/AdminPortfolio';
import AdminSubmissionDetail from './pages/AdminSubmissionDetail';
import AdminSubmissions from './pages/AdminSubmissions';
import AdminTemplates from './pages/AdminTemplates';
import AdminTemplatesStudio from './pages/AdminTemplatesStudio';
import AdminTemplatesStudioDuplicate from './pages/AdminTemplatesStudioDuplicate';
import AdminTemplatesStudioEdit from './pages/AdminTemplatesStudioEdit';
import AdminTemplatesStudioPreview from './pages/AdminTemplatesStudioPreview';
import AdminUsers from './pages/AdminUsers';
import Assignments from './pages/Assignments';
import BeginLearning from './pages/BeginLearning';
import Certifications from './pages/Certifications';
import Courses from './pages/Courses';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import MyCertification from './pages/MyCertification';
import MyPortfolio from './pages/MyPortfolio';
import MyProjects from './pages/MyProjects';
import RoleRedirect from './pages/RoleRedirect';
import StudentAITools from './pages/StudentAITools';
import StudentAssignmentDetail from './pages/StudentAssignmentDetail';
import StudentAssignments from './pages/StudentAssignments';
import StudentCertification from './pages/StudentCertification';
import StudentCertificationAttempt from './pages/StudentCertificationAttempt';
import StudentCertificationConfirm from './pages/StudentCertificationConfirm';
import StudentCertificationLoading from './pages/StudentCertificationLoading';
import StudentCertificationReady from './pages/StudentCertificationReady';
import StudentCertificationResults from './pages/StudentCertificationResults';
import StudentCertificationReview from './pages/StudentCertificationReview';
import StudentDashboard from './pages/StudentDashboard';
import StudentPortfolio from './pages/StudentPortfolio';
import StudentPortfolioItemDetail from './pages/StudentPortfolioItemDetail';
import StudentProjectDetail from './pages/StudentProjectDetail';
import StudentProjects from './pages/StudentProjects';
import TutorAITools from './pages/TutorAITools';
import TutorAssignmentSubmissions from './pages/TutorAssignmentSubmissions';
import TutorCohorts from './pages/TutorCohorts';
import TutorDashboard from './pages/TutorDashboard';
import TutorPortfolioReview from './pages/TutorPortfolioReview';
import TutorPortfolioReviews from './pages/TutorPortfolioReviews';
import TutorProjectSubmissions from './pages/TutorProjectSubmissions';
import TutorSubmissionReview from './pages/TutorSubmissionReview';
import CohortDetail from './pages/CohortDetail';
import AdminStudents from './pages/AdminStudents';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AITools": AITools,
    "AdminCohortOverview": AdminCohortOverview,
    "AdminCohorts": AdminCohorts,
    "AdminDashboard": AdminDashboard,
    "AdminExamBankImport": AdminExamBankImport,
    "AdminExamDetail": AdminExamDetail,
    "AdminExams": AdminExams,
    "AdminOverview": AdminOverview,
    "AdminPortfolio": AdminPortfolio,
    "AdminSubmissionDetail": AdminSubmissionDetail,
    "AdminSubmissions": AdminSubmissions,
    "AdminTemplates": AdminTemplates,
    "AdminTemplatesStudio": AdminTemplatesStudio,
    "AdminTemplatesStudioDuplicate": AdminTemplatesStudioDuplicate,
    "AdminTemplatesStudioEdit": AdminTemplatesStudioEdit,
    "AdminTemplatesStudioPreview": AdminTemplatesStudioPreview,
    "AdminUsers": AdminUsers,
    "Assignments": Assignments,
    "BeginLearning": BeginLearning,
    "Certifications": Certifications,
    "Courses": Courses,
    "Dashboard": Dashboard,
    "Home": Home,
    "MyCertification": MyCertification,
    "MyPortfolio": MyPortfolio,
    "MyProjects": MyProjects,
    "RoleRedirect": RoleRedirect,
    "StudentAITools": StudentAITools,
    "StudentAssignmentDetail": StudentAssignmentDetail,
    "StudentAssignments": StudentAssignments,
    "StudentCertification": StudentCertification,
    "StudentCertificationAttempt": StudentCertificationAttempt,
    "StudentCertificationConfirm": StudentCertificationConfirm,
    "StudentCertificationLoading": StudentCertificationLoading,
    "StudentCertificationReady": StudentCertificationReady,
    "StudentCertificationResults": StudentCertificationResults,
    "StudentCertificationReview": StudentCertificationReview,
    "StudentDashboard": StudentDashboard,
    "StudentPortfolio": StudentPortfolio,
    "StudentPortfolioItemDetail": StudentPortfolioItemDetail,
    "StudentProjectDetail": StudentProjectDetail,
    "StudentProjects": StudentProjects,
    "TutorAITools": TutorAITools,
    "TutorAssignmentSubmissions": TutorAssignmentSubmissions,
    "TutorCohorts": TutorCohorts,
    "TutorDashboard": TutorDashboard,
    "TutorPortfolioReview": TutorPortfolioReview,
    "TutorPortfolioReviews": TutorPortfolioReviews,
    "TutorProjectSubmissions": TutorProjectSubmissions,
    "TutorSubmissionReview": TutorSubmissionReview,
    "CohortDetail": CohortDetail,
    "AdminStudents": AdminStudents,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};