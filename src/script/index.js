import '/src/style/index.scss';
import './comps/slider'
import './comps/zoom'
import './comps/loader'
import './comps/typing'
import resumeFile from '../../resume.pptx';

// Update the resume link with the webpack-generated path
document.addEventListener('DOMContentLoaded', () => {
    const resumeLink = document.querySelector('a[href="/resume.pptx"], a[href*="resume.pptx"]');
    if (resumeLink) {
        resumeLink.href = resumeFile;
    } else {
        console.warn('Resume download link not found in the DOM');
    }
});