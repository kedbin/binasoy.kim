
const typeText = async (element, text, delay = 100) => {
    for (let i = 0; i < text.length; i++) {
        element.textContent += text.charAt(i);
        await new Promise(r => setTimeout(r, delay));
    }
};

const deleteText = async (element, delay = 50) => {
    while (element.textContent.length > 0) {
        element.textContent = element.textContent.slice(0, -1);
        await new Promise(r => setTimeout(r, delay));
    }
};

const loopTyping = async () => {
    const logoElement = document.getElementById('typing-logo');
    if (!logoElement) return;

    while (true) {
        // Step 1: Type Name
        await typeText(logoElement, "KIM EDRIAN BINASOY");
        
        // Wait
        await new Promise(r => setTimeout(r, 2000));

        // Step 2: Add (relearn.ing)
        await typeText(logoElement, " (relearn.ing)");

        // Wait longer (5s as requested)
        await new Promise(r => setTimeout(r, 5000));

        // Step 3: Delete all
        await deleteText(logoElement);

        // Short pause before restarting
        await new Promise(r => setTimeout(r, 500));
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loopTyping();
});
