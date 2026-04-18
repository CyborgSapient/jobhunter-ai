import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth, syncUser, extractUser } from '../middleware/auth.js';

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── POST /api/ai/analyse-resume ────────────────────
// Accepts base64 PDF + target role, returns parsed & ATS-optimised resume data
router.post('/analyse-resume', requireAuth(), syncUser, extractUser, async (req, res) => {
  try {
    const { resume_b64, target_role } = req.body;

    if (!resume_b64 || !target_role) {
      return res.status(400).json({ error: 'resume_b64 and target_role are required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const prompt = `You are an expert ATS resume parser AND rewriter. Analyze the attached resume PDF for a "${target_role}" role.

CRITICAL EXTRACTION RULES — DO NOT SKIP ANY DATA:
1. Extract EVERY skill, tool, technology, framework, platform mentioned anywhere in the resume — verbatim. If the resume lists 18 tools, return all 18. Do NOT pick a "top 5".
2. Extract EVERY certification (full name, issuer if present).
3. Extract EVERY project / achievement / portfolio item (name + 1–2 sentence description + measurable impact if stated).
4. Capture LinkedIn URL, GitHub URL, portfolio URL, or any other professional links exactly as written.
5. Capture ALL education entries (degree, institution, year, grade if present) — concatenate multiple as separate lines.
6. Capture ALL work experience entries with their original company, role, duration. NEVER drop a job. Then rewrite the bullet points (3–5 per role) in STAR format with quantified, ATS-optimised language for the target "${target_role}" role.
7. For the summary, write a powerful 3–4 sentence ATS-optimised paragraph tailored to the "${target_role}" role using keywords from the resume.
8. Always set atsScore to 100 (resume has been rewritten for perfect ATS).

Return ONLY valid JSON (no markdown fences, no commentary) with these EXACT keys:
{
  "name": "",
  "currentRole": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin": "",
  "github": "",
  "portfolio": "",
  "yearsExp": 0,
  "summary": "",
  "topSkills": [],
  "certifications": [],
  "education": "",
  "experience": [{"company":"","role":"","duration":"","bullets":[]}],
  "projects": [{"name":"","description":"","impact":""}],
  "achievements": [],
  "atsScore": 100,
  "keyStrengths": [],
  "gaps": [],
  "suggestedKeywords": []
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: resume_b64 },
          },
          { type: 'text', text: prompt },
        ],
      }],
    });

    const text = response.content?.[0]?.text || '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g, ''));

    res.json({ resume_data: parsed });
  } catch (err) {
    console.error('[AI /analyse-resume]', err.message);
    res.status(500).json({ error: 'Resume analysis failed' });
  }
});

// ── POST /api/ai/generate-bullets ──────────────────
// Accepts resume data + target role, returns 5 ATS-optimised bullet points
router.post('/generate-bullets', requireAuth(), syncUser, extractUser, async (req, res) => {
  try {
    const { resume_data, target_role } = req.body;

    if (!resume_data || !target_role) {
      return res.status(400).json({ error: 'resume_data and target_role are required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Profile: ${JSON.stringify(resume_data)}. Write 5 powerful ATS-optimised STAR bullet points for a ${target_role} role. Return ONLY a JSON array of 5 strings, no markdown.`,
      }],
    });

    const text = response.content?.[0]?.text || '[]';
    const bullets = JSON.parse(text.replace(/```json|```/g, ''));

    res.json({ bullets });
  } catch (err) {
    console.error('[AI /generate-bullets]', err.message);
    res.status(500).json({ error: 'Bullet generation failed' });
  }
});

export default router;
