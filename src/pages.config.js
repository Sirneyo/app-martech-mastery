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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};