// ─────────────────────────────────────────────────────────────
// ALL personal content lives here. Replace every "TODO" value.
// The 3D billboards and the HTML sections both read from this file.
// ─────────────────────────────────────────────────────────────

export interface Project {
  id: string
  title: string
  description: string
  tech: string[]
  links: { label: string; href: string }[]
  /** Path under /public, e.g. "/projects/my-app.jpg". Leave empty to use a generated cover. */
  image: string
}

export interface SkillGroup {
  label: string
  items: string[]
}

export interface ContactLink {
  label: string
  href: string
  /** Short code shown on the beacon, e.g. "GH". */
  code: string
}

export const content = {
  name: 'YOUR NAME', // TODO
  title: 'Creative Developer', // TODO
  tagline: 'Building things that glow in the dark.', // TODO
  location: 'TODO City, Country', // TODO

  bio: [
    // TODO: 2–3 short paragraphs
    'TODO: Who you are in one or two sentences.',
    'TODO: What you work on and what you care about.',
  ],

  projects: [
    {
      id: 'project-one',
      title: 'TODO Project One',
      description: 'TODO: One or two sentences on what it does and your role.',
      tech: ['TypeScript', 'React'],
      links: [
        { label: 'Live', href: 'https://example.com' },
        { label: 'Code', href: 'https://github.com/' },
      ],
      image: '',
    },
    {
      id: 'project-two',
      title: 'TODO Project Two',
      description: 'TODO: One or two sentences on what it does and your role.',
      tech: ['Python', 'PyTorch'],
      links: [{ label: 'Code', href: 'https://github.com/' }],
      image: '',
    },
    {
      id: 'project-three',
      title: 'TODO Project Three',
      description: 'TODO: One or two sentences on what it does and your role.',
      tech: ['Three.js', 'GLSL'],
      links: [{ label: 'Live', href: 'https://example.com' }],
      image: '',
    },
    {
      id: 'project-four',
      title: 'TODO Project Four',
      description: 'TODO: One or two sentences on what it does and your role.',
      tech: ['Node.js', 'PostgreSQL'],
      links: [{ label: 'Code', href: 'https://github.com/' }],
      image: '',
    },
  ] satisfies Project[],

  skills: [
    { label: 'Languages', items: ['TypeScript', 'Python', 'C++'] }, // TODO
    { label: 'Frontend', items: ['React', 'Three.js', 'GLSL', 'Tailwind'] }, // TODO
    { label: 'Backend', items: ['Node.js', 'PostgreSQL'] }, // TODO
    { label: 'Tools', items: ['Git', 'Docker', 'Figma'] }, // TODO
  ] satisfies SkillGroup[],

  contact: {
    email: 'you@example.com', // TODO
    links: [
      { label: 'GitHub', href: 'https://github.com/', code: 'GH' }, // TODO
      { label: 'LinkedIn', href: 'https://linkedin.com/', code: 'IN' }, // TODO
      { label: 'Email', href: 'mailto:you@example.com', code: '@' }, // TODO
    ] satisfies ContactLink[],
  },
}
