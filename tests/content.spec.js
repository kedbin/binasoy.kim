import { test, expect } from './lib';

test.describe('Content', () => {
  test('hero shows name, roles, and value proposition', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Kim Edrian Binasoy');
    await expect(page.locator('.hero-roles')).toContainText(/Cloud/i);
    await expect(page.locator('.hero-roles')).toContainText(/QA Automation/i);
    await expect(page.locator('.hero-roles')).toContainText(/AI/i);
    await expect(page.locator('.status-badge')).toContainText(/Open to work/i);
  });

  test('lists the Google Cloud Professional trio certifications', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    const names = page.locator('.cert-name');
    const text = (await names.allTextContents()).join(' | ');
    expect(text).toContain('DevOps Engineer');
    expect(text).toContain('Security Engineer');
    expect(text).toContain('Architect');
    expect(text).toContain('AZ-204');
    expect(text).toContain('Cloud Practitioner');
  });

  test('skills groups are populated', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    const groups = page.locator('.skill-group');
    await expect(groups).toHaveCount(5);
    // Spot-check key skills appear as chips.
    const chipsText = (await page.locator('.chips li').allTextContents()).join(' | ');
    for (const skill of ['Azure', 'Terraform', 'Playwright', 'Python', 'CI/CD']) {
      expect(chipsText).toContain(skill);
    }
  });

  test('experience timeline has three roles with Accenture', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    const items = page.locator('.timeline-item');
    await expect(items).toHaveCount(3);
    const companies = (await page.locator('.timeline-company').allTextContents()).join(' ');
    expect(companies.match(/Accenture/g)?.length).toBe(3);
    const roles = (await page.locator('.timeline-role').allTextContents()).join(' | ');
    expect(roles).toContain('AI Automation Engineer');
    expect(roles).toContain('Project Management Officer');
  });

  test('projects section includes the flagship platform', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    await expect(page.locator('.project-flagship')).toBeVisible();
    await expect(page.locator('.project-link')).toHaveAttribute('href', 'https://relearn.ing');
  });
});
