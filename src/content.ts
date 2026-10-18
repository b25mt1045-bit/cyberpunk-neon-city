// ─────────────────────────────────────────────────────────────
// ALL personal content lives here.
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
  name: 'Tanay Bhatt',
  title: 'Developer | AI/Backend Builder',
  tagline: 'Building practical software at the intersection of AI, backend engineering, and decentralized systems.',
  location: 'Udaipur, Rajasthan, India',

  bio: [
    "I'm a second-year undergraduate at IIT Jodhpur, passionate about software development, backend engineering, and building things that solve real problems. I enjoy exploring new technologies, experimenting with ideas, and turning concepts into working projects.",
    "I actively participate in hackathons and enjoy working on projects involving AI agents, APIs, distributed systems, and developer tools. I'm particularly interested in understanding how systems work under the hood, from networking and concurrency to scalable architectures.",
    "I'm also working toward becoming a stronger open-source contributor, with a particular interest in programs like Google Summer of Code (GSoC) and Summer of Bitcoin. I enjoy collaborating with other developers, learning from real-world codebases, and contributing to projects that people actually use.",
  ],

  projects: [
    {
      id: 'kuberbolt',
      title: 'Kuberbolt',
      description:
        'Infrastructure that lets AI agents access paid web services through HTTP 402 and Lightning Network payments. Explores agent payment workflows, non-custodial payments, and middleware for integrating payments into agent request loops.',
      tech: ['Go', 'Python', 'FastAPI', 'LangChain', 'HTTPX', 'Lightning Network', 'LDK', 'libp2p'],
      links: [{ label: 'Code', href: 'https://github.com/devlup-labs/kuberbolt' }],
      image: '',
    },
    {
      id: 'studyforge',
      title: 'StudyForge',
      description:
        'Planned. A generative AI study material generator that turns lecture PDFs and slides into summaries, flashcards and quizzes.',
      tech: ['LLM API', 'Structured JSON', 'RAG', 'FastAPI', 'Docker', 'GitHub Actions'],
      links: [],
      image: '',
    },
    {
      id: 'researchcrew',
      title: 'ResearchCrew',
      description:
        'Planned. A multi-agent research assistant: Planner, Researcher, Critic and Writer agents produce a cited report, and the UI shows the agents working live.',
      tech: ['LangGraph', 'CrewAI', 'Claude Agent SDK', 'Tool use', 'LangSmith', 'OpenTelemetry'],
      links: [],
      image: '',
    },
    {
      id: 'opspilot',
      title: 'OpsPilot',
      description:
        'Planned. A multi-agent DevOps incident responder: agents detect, diagnose and propose fixes for faults in a Dockerized or Kubernetes app, and a human approves risky actions.',
      tech: ['Docker', 'Kubernetes', 'kind', 'Prometheus', 'Grafana', 'Agent tool use'],
      links: [],
      image: '',
    },
  ] satisfies Project[],

  skills: [
    { label: 'Languages', items: ['C', 'C++', 'Python', 'Go'] },
    { label: 'Backend', items: ['FastAPI', 'REST APIs', 'HTTPX', 'Webhooks', 'Asynchronous Programming'] },
    { label: 'AI & ML', items: ['LangChain', 'AI Agents', 'NumPy', 'Pandas', 'Scikit-learn', 'ChromaDB'] },
    {
      label: 'Systems',
      items: ['Networking', 'Concurrency', 'Distributed Systems', 'HTTP', 'Lightning Network fundamentals'],
    },
    { label: 'Dev Tools', items: ['Git', 'GitHub', 'Linux/CLI', 'Jupyter Notebook'] },
    {
      label: 'Exploring',
      items: ['Open-source development', 'LDK', 'Decentralized systems', 'Agentic payments', 'Scalable backend architectures'],
    },
  ] satisfies SkillGroup[],

  contact: {
    email: 'tanaybhatt58@gmail.com',
    links: [
      { label: 'GitHub', href: 'https://github.com/b25mt1045-bit', code: 'GH' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/tanay-bhatt-8601742ab', code: 'IN' },
      { label: 'Email', href: 'mailto:tanaybhatt58@gmail.com', code: '@' },
    ] satisfies ContactLink[],
  },
}
