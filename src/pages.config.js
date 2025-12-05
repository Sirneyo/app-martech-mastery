import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Certifications from './pages/Certifications';
import Assignments from './pages/Assignments';
import MyProjects from './pages/MyProjects';
import MyPortfolio from './pages/MyPortfolio';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Courses": Courses,
    "Certifications": Certifications,
    "Assignments": Assignments,
    "MyProjects": MyProjects,
    "MyPortfolio": MyPortfolio,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};