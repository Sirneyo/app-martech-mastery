import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Certifications from './pages/Certifications';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Courses": Courses,
    "Certifications": Certifications,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};