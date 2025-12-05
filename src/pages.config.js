import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Certifications from './pages/Certifications';
import KajabiBrowser from './pages/KajabiBrowser';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Courses": Courses,
    "Certifications": Certifications,
    "KajabiBrowser": KajabiBrowser,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};