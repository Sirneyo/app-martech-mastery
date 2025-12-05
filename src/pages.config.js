import Dashboard from './pages/Dashboard';
import MarketoBrowser from './pages/MarketoBrowser';
import Courses from './pages/Courses';
import Certifications from './pages/Certifications';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "MarketoBrowser": MarketoBrowser,
    "Courses": Courses,
    "Certifications": Certifications,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};