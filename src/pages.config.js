import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Certifications from './pages/Certifications';
import Assignments from './pages/Assignments';
import MyProjects from './pages/MyProjects';
import MyPortfolio from './pages/MyPortfolio';
import AITools from './pages/AITools';
import MyCertification from './pages/MyCertification';
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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};