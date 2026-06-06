const agents = [
  {
    name: "职业探索官",
    description: "从兴趣、专业、经历和偏好出发，帮学生找到更适合自己的职业方向。",
    href: "/career-explorer.html",
    tag: "Career Discovery",
    stats: ["方向推荐", "能力画像", "成长路径"],
  },
  {
    name: "岗位匹配官",
    description: "解析目标岗位JD，对比简历能力与岗位要求，输出清晰的匹配度报告。",
    href: "/job-matcher.html",
    tag: "Job Matching",
    stats: ["JD解析", "匹配评分", "差距定位"],
  },
  {
    name: "简历优化官",
    description: "ATS优化、真实性验证、面试准备三合一，生成AI驱动的全方位简历分析报告。",
    href: "/resume-optimizer.html",
    tag: "Resume Optimize",
    stats: ["ATS优化", "真实性验证", "面试准备"],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <p className="text-sm font-medium text-cyan-600">Offer捕手</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">
              AI求职智能体工作台
            </h1>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            智能分析已就绪
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="max-w-xl">
            <p className="mb-4 inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700">
              从职业方向到优化版简历
            </p>
            <h2 className="text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              让每一次投递都更接近目标岗位
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600">
              Offer捕手提供三个核心智能体，覆盖学生求职全流程：先确定方向，再匹配岗位，最后通过AI真实性验证和ATS优化生成高竞争力简历。
            </p>
          </div>

          <div className="grid gap-4">
            {agents.map((agent) => (
              <a
                key={agent.name}
                href={agent.href}
                className="group block border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600">
                  {agent.tag}
                </p>
                <div className="mt-3 flex items-start justify-between gap-5">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-950">
                      {agent.name}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {agent.description}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-lg text-white transition group-hover:bg-cyan-600">
                    →
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {agent.stats.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
