import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Certifications from './pages/Certifications';
import Assignments from './pages/Assignments';
import MyProjects from './pages/MyProjects';
import MyPortfolio from './pages/MyPortfolio';
import AITools from './pages/AITools';
import MyCertification from './pages/MyCertification';
import AdminUsers from './pages/AdminUsers';
import AdminCohorts from './pages/AdminCohorts';
import AdminTemplates from './pages/AdminTemplates';
import StudentDashboard from './pages/StudentDashboard';
import TutorDashboard from './pages/TutorDashboard';
import StudentAITools from './pages/StudentAITools';
import TutorAITools from './pages/TutorAITools';
import StudentAssignments from './pages/StudentAssignments';
import StudentProjects from './pages/StudentProjects';
import StudentCertification from './pages/StudentCertification';
import StudentPortfolio from './pages/StudentPortfolio';
import TutorCohorts from './pages/TutorCohorts';
import TutorAssignmentSubmissions from './pages/TutorAssignmentSubmissions';
import TutorProjectSubmissions from './pages/TutorProjectSubmissions';
import TutorPortfolioReviews from './pages/TutorPortfolioReviews';
import RoleRedirect from './pages/RoleRedirect';
import StudentAssignmentDetail from './pages/StudentAssignmentDetail';
import StudentProjectDetail from './pages/StudentProjectDetail';
import TutorSubmissionReview from './pages/TutorSubmissionReview';
import StudentPortfolioItemDetail from './pages/StudentPortfolioItemDetail';
import TutorPortfolioReview from './pages/TutorPortfolioReview';
import StudentCertificationAttempt from './pages/StudentCertificationAttempt';
import StudentCertificationResults from './pages/StudentCertificationResults';
import AdminExamBankImport from './pages/AdminExamBankImport';
import StudentCertificationLoading from './pages/StudentCertificationLoading';
import StudentCertificationReview from './pages/StudentCertificationReview';
import StudentCertificationConfirm from './pages/StudentCertificationConfirm';
import StudentCertificationReady from './pages/StudentCertificationReady';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Courses": Courses,
    "Certifications": Certifications,
    "Assignments": Assignments,
    "MyProjects": MyProjects,
    "MyPortfolio": MyPortfolio,
    "AITools": AITools,
    "MyCertification": MyCertification,
    "AdminUsers": AdminUsers,
    "AdminCohorts": AdminCohorts,
    "AdminTemplates": AdminTemplates,
    "StudentDashboard": StudentDashboard,
    "TutorDashboard": TutorDashboard,
    "StudentAITools": StudentAITools,
    "TutorAITools": TutorAITools,
    "StudentAssignments": StudentAssignments,
    "StudentProjects": StudentProjects,
    "StudentCertification": StudentCertification,
    "StudentPortfolio": StudentPortfolio,
    "TutorCohorts": TutorCohorts,
    "TutorAssignmentSubmissions": TutorAssignmentSubmissions,
    "TutorProjectSubmissions": TutorProjectSubmissions,
    "TutorPortfolioReviews": TutorPortfolioReviews,
    "RoleRedirect": RoleRedirect,
    "StudentAssignmentDetail": StudentAssignmentDetail,
    "StudentProjectDetail": StudentProjectDetail,
    "TutorSubmissionReview": TutorSubmissionReview,
    "StudentPortfolioItemDetail": StudentPortfolioItemDetail,
    "TutorPortfolioReview": TutorPortfolioReview,
    "StudentCertificationAttempt": StudentCertificationAttempt,
    "StudentCertificationResults": StudentCertificationResults,
    "AdminExamBankImport": AdminExamBankImport,
    "StudentCertificationLoading": StudentCertificationLoading,
    "StudentCertificationReview": StudentCertificationReview,
    "StudentCertificationConfirm": StudentCertificationConfirm,
    "StudentCertificationReady": StudentCertificationReady,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};