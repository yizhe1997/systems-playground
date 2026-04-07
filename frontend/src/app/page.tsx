'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  Rocket, 
  BookOpen, 
  FileDown, 
  Settings, 
  ExternalLink, 
  Code2, 
  FolderOpen,
  Gamepad2,
  FileText,
  ArrowRight,
  Power,
  Loader2,
  CircleDot,
  Server,
  Database,
  MessageSquare,
  Menu
} from 'lucide-react';

const GithubIcon = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current">
    <title>GitHub</title>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

const LinkedinIcon = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current">
    <title>LinkedIn</title>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.847-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import RabbitMQDemo from '@/components/demos/RabbitMQDemo';
import RedpandaDemo from '@/components/demos/RedpandaDemo';
import ThemeToggle from '@/components/ThemeToggle';
import { BentoCard, EmptyState, fadeInUp, staggerContainer } from '@/components/ui/Shared';
import { SectionHeader } from '@/components/ui/SectionHeader';

type Widget = {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
};

type Project = {
  id: string;
  title: string;
  description: string;
  tech_stack: string[];
  live_url: string;
  github_url: string;
};

export default function Home() {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<string[]>([]);
  const [featuredDemos, setFeaturedDemos] = useState<string[]>([]);
  const [featuredDocs, setFeaturedDocs] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string>('#');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('#');
  const [githubUrl, setGithubUrl] = useState<string>('#');
  
  const [adrModalOpen, setAdrModalOpen] = useState(false);
  const [adrContent, setAdrContent] = useState<string>('');
  const [adrTitle, setAdrTitle] = useState<string>('');

  const [activeDemo, setActiveDemo] = useState<Widget | null>(null);
  
  const { toast } = useToast();

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ name: '', email: '', company: '', reason: '' });
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  const formatUrl = (url: string) => {
    if (!url || url === '#') return '#';
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };

  const handleResumeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSubmitting(true);
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      const res = await fetch(`${url}/api/resume/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestForm)
      });
      if (res.ok) {
        setRequestModalOpen(false);
        toast({ title: "Request sent successfully!", description: "Check your email soon." });
        setRequestForm({ name: '', email: '', company: '', reason: '' });
      } else {
        toast({ title: "Error", description: "Failed to send request. Please try again.", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Network error while sending request.", variant: "destructive" });
    } finally {
      setRequestSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchWidgets = () => {
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085') + '/admin/widgets')
        .then((res) => res.json())
        .then((data) => {
          setWidgets(data);
          setLoading(false);
          // If we were waking a widget and it's now running, clear the waking state
          if (waking) {
            const wokenWidget = data.find((w: Widget) => w.id === waking);
            if (wokenWidget && wokenWidget.status === 'running') {
              setWaking(null);
            }
          }
        })
        .catch((err) => {
          console.error('Error fetching widgets:', err);
          setLoading(false);
        });
    };
    
    fetchWidgets();
    const interval = setInterval(fetchWidgets, 5000);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';

    // Fetch dynamic resume links
    fetch(apiUrl + '/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.resumeUrl) setResumeUrl(data.resumeUrl);
        if (data.linkedinUrl) setLinkedinUrl(data.linkedinUrl);
        if (data.githubUrl) setGithubUrl(data.githubUrl);
      })
      .catch(console.error);

    // Fetch CMS Projects & Homepage Visibility
    fetch(apiUrl + '/api/projects')
      .then((res) => res.json())
      .then((data) => setProjects(data || []))
      .catch(console.error);

    fetch(apiUrl + '/api/documents')
      .then((res) => res.json())
      .then((data) => setDocs(data || []))
      .catch(console.error);

    fetch(apiUrl + '/api/homepage')
      .then((res) => res.json())
      .then((data) => {
        setFeaturedProjects(data.featured_projects || []);
        setFeaturedDemos(data.featured_demos || []);
        setFeaturedDocs(data.featured_docs || []);
      })
      .catch(console.error);

    return () => clearInterval(interval);
  }, [waking]);

  const wakeWidget = async (id: string) => {
    setWaking(id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      await fetch(`${apiUrl}/api/demo/widgets/${id}/wake`, { method: 'POST' });
      // The interval polling will catch the status change
    } catch (err) {
      console.error('Failed to wake widget:', err);
      setWaking(null);
    }
  };

  const filteredProjects = projects.filter(p => featuredProjects.includes(p.id)).slice(0, 4);
  const filteredWidgets = widgets.filter(w => featuredDemos.includes(w.type)).slice(0, 4);
  const filteredDocs = docs.filter(d => featuredDocs.includes(d.id)).slice(0, 4);

  return (
    <main className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Header/Nav */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <img src="/logo.svg" alt="Systems Playground > YZ" className="h-10 sm:h-12 w-auto opacity-90 group-hover:opacity-100 transition-opacity" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/projects" className="text-muted-foreground hover:text-foreground transition-colors">
              Projects
            </Link>
            <Link href="/playground" className="text-muted-foreground hover:text-foreground transition-colors">
              Playground
            </Link>
            <Link href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="w-px h-5 bg-border hidden sm:block" />
            
            {/* Desktop Admin Button */}
            <Link 
              href="/admin" 
              className="hidden sm:inline-flex items-center gap-2 rounded-xl text-sm font-medium transition-all border border-border bg-card hover:bg-accent hover:border-primary/50 h-9 px-4 text-foreground"
            >
              <Settings className="w-4 h-4" />
              <span>Control Plane</span>
            </Link>

            {/* Mobile Menu */}
            <div className="sm:hidden flex items-center">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button className="p-2 -mr-2 flex items-center justify-center text-foreground hover:text-primary transition-colors">
                    <Menu className="w-6 h-6" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-background border-l border-border w-[280px] p-6 flex flex-col gap-8">
                  <SheetHeader>
                    <SheetTitle className="text-left font-bold tracking-tight">Navigation</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-6 text-base font-medium">
                    <Link href="/projects" onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                      Projects
                    </Link>
                    <Link href="/playground" onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                      Playground
                    </Link>
                    <Link href="/docs" onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                      Docs
                    </Link>
                  </nav>
                  
                  <div className="mt-auto pt-6 border-t border-border">
                    <Link 
                      href="/admin" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all border border-border bg-card hover:bg-accent hover:border-primary/50 h-10 px-4 text-foreground"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Control Plane</span>
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full max-w-6xl mx-auto px-6 py-20 md:py-28">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.h1 
            variants={fadeInUp}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 text-balance"
          >
            Hi, I&apos;m YZ.
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-emerald-500 bg-clip-text text-transparent">
              I build scalable cloud systems.
            </span>
          </motion.h1>
          <motion.div 
            variants={fadeInUp}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed space-y-4"
          >
            <p>
              I&apos;m a Backend-focused Software Engineer with deep expertise in .NET and Golang, alongside full-stack experience with Blazor, Angular, and React. 
              I focus on architecting resilient distributed systems, automating complex cloud deployment pipelines, and modernizing enterprise applications.
            </p>
            <p>
              This site serves as my interactive <strong>Systems Playground</strong>—a live environment to explore my projects, read my blogs, and interact directly with my scale-to-zero containerized backend demos below.
            </p>
          </motion.div>
          <motion.div 
            variants={fadeInUp}
            className="flex flex-wrap gap-3"
          >
            <button 
              onClick={() => setRequestModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-foreground/10"
            >
              <FileDown className="w-4 h-4" />
              Request Full Resume
            </button>
            <a 
              href={formatUrl(linkedinUrl)} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border border-border text-foreground rounded-xl font-medium hover:bg-accent hover:border-primary/50 transition-all"
            >
              <LinkedinIcon />
              LinkedIn
            </a>
            <a 
              href={formatUrl(githubUrl)} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border border-border text-foreground rounded-xl font-medium hover:bg-accent hover:border-primary/50 transition-all"
            >
              <GithubIcon />
              GitHub
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Featured Projects - Bento Grid */}
      <section id="projects" className="w-full border-t border-border/50 py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <SectionHeader
              icon={Briefcase}
              title="Featured Projects"
              description="Standalone applications and cloud-native services currently in development or production."
              linkHref="/projects"
              linkText="View All Projects"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.length === 0 ? (
                <EmptyState 
                  icon={FolderOpen}
                  title="It&apos;s empty at the moment..."
                  subtitle="Real-world applications are currently in development."
                />
              ) : (
                filteredProjects.map((project, index) => (
                  <BentoCard 
                    key={project.id} 
                    size="default"
                    glowColor="primary"
                  >
                    <h3 className="text-xl font-bold text-foreground mb-3">{project.title}</h3>
                    <p className="text-muted-foreground leading-relaxed mb-5 line-clamp-3">
                      {project.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {project.tech_stack.slice(0, 4).map(tech => (
                        <span 
                          key={tech} 
                          className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-lg border border-primary/20"
                        >
                          {tech}
                        </span>
                      ))}
                      {project.tech_stack.length > 4 && (
                        <span className="px-2.5 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-lg">
                          +{project.tech_stack.length - 4}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 pt-5 border-t border-border">
                      <a 
                        href={formatUrl(project.live_url)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-all text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Live App
                      </a>
                      <a 
                        href={formatUrl(project.github_url)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-card border border-border hover:bg-accent hover:border-primary/50 text-foreground rounded-xl font-medium transition-all text-sm"
                      >
                        <Code2 className="w-4 h-4" />
                        Source
                      </a>
                    </div>
                  </BentoCard>
                ))
              )}
            </div>
            
            <div className="mt-8 text-center sm:hidden">
              <Link href="/projects" className="inline-flex items-center gap-2 text-primary font-medium">
                View All Projects
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Interactive Playground - Bento Grid */}
      <section id="playground" className="w-full border-y border-border/50 py-20 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <SectionHeader
              icon={Rocket}
              title="Interactive Systems Playground"
              description="These aren't simulated animations. Below are real infrastructure containers connected to a Golang control plane. They are built using a Scale-to-Zero architecture—they shut down automatically when idle to conserve memory."
              linkHref="/playground"
              linkText="View All Experiments"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {loading ? (
                <motion.div 
                  variants={fadeInUp}
                  className="col-span-full flex items-center justify-center gap-3 p-12 text-muted-foreground"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking infrastructure status...
                </motion.div>
              ) : filteredWidgets.length === 0 ? (
                <EmptyState 
                  icon={Gamepad2}
                  title="It&apos;s empty at the moment..."
                  subtitle="Playground widgets will appear here when featured."
                />
              ) : (
                filteredWidgets.map((widget, index) => (
                  <BentoCard 
                    key={widget.id}
                    size="default"
                    glowColor={widget.status === 'running' ? 'emerald' : 'rose'}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                          {widget.type === 'queue' ? (
                            <MessageSquare className="w-5 h-5 text-muted-foreground" />
                          ) : widget.type === 'cache' ? (
                            <Database className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <Server className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{widget.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <CircleDot className={`w-3 h-3 ${widget.status === 'running' ? 'text-emerald-500' : 'text-rose-500'}`} />
                            <span className={`text-xs font-medium uppercase tracking-wider ${widget.status === 'running' ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {widget.status === 'running' ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full sm:w-auto">
                        {widget.status === 'running' ? (
                          <button 
                            onClick={() => setActiveDemo(widget)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                          >
                            <Rocket className="w-4 h-4" />
                            Launch Demo
                          </button>
                        ) : (
                          <button 
                            onClick={() => wakeWidget(widget.id)}
                            disabled={waking === widget.id}
                            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                              waking === widget.id 
                                ? 'bg-primary/50 text-primary-foreground cursor-wait' 
                                : 'bg-card border border-border text-foreground hover:bg-accent hover:border-primary/50'
                            }`}
                          >
                            {waking === widget.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Booting via Golang...
                              </>
                            ) : (
                              <>
                                <Power className="w-4 h-4" />
                                Wake Container
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground pt-5 border-t border-border leading-relaxed mb-4 mt-6">
                      {(() => {
                        const desc = widget.description || '';
                        if (desc.includes('Use Cases:') && desc.includes('Solution:')) {
                          const parts = desc.split('Solution:');
                          const useCasesText = parts[0].replace('Use Cases:', '').trim();
                          const solutionText = parts[1].trim();
                          
                          // Optional: Bold specific known keywords if they appear
                          const formatText = (text: string) => {
                            if (text.includes('Event-Driven Architecture (EDA)')) {
                              const [before, after] = text.split('Event-Driven Architecture (EDA)');
                              return <>{before}<strong className="text-foreground">Event-Driven Architecture (EDA)</strong>{after}</>;
                            }
                            if (text.includes('FIFO task delegation')) {
                              const [before, after] = text.split('FIFO task delegation');
                              return <>{before}<strong className="text-foreground">FIFO task delegation</strong>{after}</>;
                            }
                            return text;
                          };

                          return (
                            <div className="space-y-3">
                              <p>
                                <strong className="text-foreground">Use Cases:</strong> {useCasesText}
                              </p>
                              <p>
                                <strong className="text-foreground">Solution:</strong> {formatText(solutionText)}
                              </p>
                            </div>
                          );
                        }
                        return <p>{desc}</p>;
                      })()}
                    </div>
                  </BentoCard>
                ))
              )}
            </div>
            
            <div className="mt-8 text-center sm:hidden">
              <Link href="/playground" className="inline-flex items-center gap-2 text-primary font-medium">
                View All Experiments
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Architecture Decision Records - Bento Grid */}
      <section id="adrs" className="w-full py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <SectionHeader
              icon={BookOpen}
              title="Architecture Decision Records"
              description="Engineering logs, system designs, and technical writing."
              linkHref="/docs"
              linkText="View All Docs"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDocs.length === 0 ? (
                <EmptyState 
                  icon={FileText}
                  title="It&apos;s empty at the moment..."
                  subtitle="Documentation will appear here when featured."
                />
              ) : (
                filteredDocs.map((doc, index) => (
                  <Link key={doc.id} href={`/docs/${doc.id}`} className="block">
                    <BentoCard 
                      size={index === 0 ? 'wide' : 'default'}
                      glowColor="secondary"
                      className="h-full cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                          {doc.title}
                        </h3>
                        <span className={`shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${
                          doc.source_type === 'external_url' 
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        }`}>
                          {doc.source_type === 'external_url' ? 'External' : 'Native'}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                        {doc.description}
                      </p>
                      <div className="flex items-center gap-2 mt-4 text-primary text-sm font-medium">
                        Read more
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </BentoCard>
                  </Link>
                ))
              )}
            </div>
            
            <div className="mt-8 text-center sm:hidden">
              <Link href="/docs" className="inline-flex items-center gap-2 text-primary font-medium">
                View All Docs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Active Demo Modal */}
      <Dialog open={activeDemo !== null} onOpenChange={(open) => !open && setActiveDemo(null)} disablePointerDismissal>
        <DialogContent className="flex flex-col max-w-[95vw] md:max-w-[85vw] lg:max-w-[1400px] max-h-[85vh] p-0 overflow-auto bg-background border border-border resize transition-all duration-300 ease-in-out">
          {activeDemo?.type === 'queue' && <RabbitMQDemo widgetId={activeDemo.id} />}
          {activeDemo?.type === 'event' && <RedpandaDemo widgetId={activeDemo.id} />}
        </DialogContent>
      </Dialog>

      {/* Resume Request Modal */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl text-foreground">Request Resume</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              For privacy and security reasons, my full resume is not publicly exposed. Please provide your details below, and an expiring link will be emailed to you upon approval.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResumeRequest} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name *</label>
              <input required value={requestForm.name} onChange={e => setRequestForm({...requestForm, name: e.target.value})} className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 outline-none" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Company Name *</label>
              <input required value={requestForm.company} onChange={e => setRequestForm({...requestForm, company: e.target.value})} className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 outline-none" placeholder="Google, Inc." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Professional Email *</label>
              <input required type="email" value={requestForm.email} onChange={e => setRequestForm({...requestForm, email: e.target.value})} className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 outline-none" placeholder="john@google.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Reason (Optional)</label>
              <textarea value={requestForm.reason} onChange={e => setRequestForm({...requestForm, reason: e.target.value})} className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 outline-none resize-none" placeholder="We are hiring for a Senior Backend role..." rows={3} />
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setRequestModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-md transition">Cancel</button>
              <button type="submit" disabled={requestSubmitting} className="px-5 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition flex items-center gap-2">
                {requestSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Submit Request
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="w-full border-t border-border/50 py-12 bg-background">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © 2026 Chin Yi Zhe. Engineered with Golang & Next.js.
          </p>
          <div className="flex items-center gap-4">
            <a href={formatUrl(githubUrl)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <GithubIcon />
            </a>
            <a href={formatUrl(linkedinUrl)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <LinkedinIcon />
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
