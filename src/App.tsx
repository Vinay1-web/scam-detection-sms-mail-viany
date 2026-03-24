import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Mail, 
  MessageSquare, 
  Link as LinkIcon, 
  AlertTriangle, 
  CheckCircle, 
  History, 
  LogOut, 
  Search, 
  ChevronRight,
  Info,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  LayoutDashboard,
  Code,
  LifeBuoy,
  Link2,
  FileSearch,
  Globe,
  Lock,
  Sun,
  Moon,
  Zap,
  Activity,
  Fingerprint,
  Cpu
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  User
} from './lib/firebase';
import { analyzeContent, AnalysisResult, runSecurityTool, ToolResult } from './lib/gemini';
import { Button } from './components/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/Card';
import { Input } from './components/Input';
import { Textarea } from './components/Textarea';
import { Badge } from './components/Badge';
import { cn } from './lib/utils';

type Tab = 'dashboard' | 'history';
type ScanType = 'email' | 'sms' | 'url';

interface ScanRecord extends AnalysisResult {
  id: string;
  userId: string;
  type: ScanType;
  content: string;
  timestamp: any;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [scanType, setScanType] = useState<ScanType>('email');
  const [inputContent, setInputContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [toolInput, setToolInput] = useState('');
  const [toolResult, setToolResult] = useState<ToolResult | null>(null);
  const [isToolRunning, setIsToolRunning] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const stats = {
    total: history.length,
    high: history.filter(s => s.riskLevel === 'High').length,
    medium: history.filter(s => s.riskLevel === 'Medium').length,
    low: history.filter(s => s.riskLevel === 'Low').length,
    percentage: history.length > 0 ? Math.round((history.filter(s => s.riskLevel === 'High').length / history.length) * 100) : 0
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'scans'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScanRecord[];
      setHistory(records);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentResult(null);
      setInputContent('');
      setSelectedTool(null);
      setToolResult(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleRunTool = async () => {
    if (!selectedTool || !toolInput.trim()) return;
    setIsToolRunning(true);
    setToolResult(null);
    try {
      const result = await runSecurityTool(selectedTool, toolInput);
      setToolResult(result);
    } catch (error) {
      console.error('Tool execution failed:', error);
    } finally {
      setIsToolRunning(false);
    }
  };

  const handleAnalyze = async () => {
    if (!inputContent.trim() || !user) return;

    setIsAnalyzing(true);
    setCurrentResult(null);

    try {
      const result = await analyzeContent(scanType, inputContent);
      setCurrentResult(result);

      // Save to Firestore
      await addDoc(collection(db, 'scans'), {
        userId: user.uid,
        type: scanType,
        content: inputContent,
        ...result,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn("flex min-h-screen flex-col items-center justify-center p-4 transition-colors duration-300", darkMode ? "bg-slate-950" : "bg-slate-50")}>
        <div className="absolute top-4 right-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setDarkMode(!darkMode)}
            className={cn(darkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 text-center"
        >
          <div className="flex flex-col items-center space-y-2">
            <div className={cn("rounded-2xl p-4 shadow-xl", darkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-600 text-white shadow-blue-200")}>
              <Shield className="h-12 w-12" />
            </div>
            <div className="flex flex-col items-center">
              <h1 className={cn("text-4xl font-bold tracking-tight", darkMode ? "text-white" : "text-slate-900")}>Phish Hunter AI</h1>
              <span className="text-xs font-bold tracking-[0.3em] text-blue-600 uppercase">Developers</span>
            </div>
            <p className={darkMode ? "text-slate-400" : "text-slate-500"}>Protect yourself from phishing, scams, and malicious links.</p>
          </div>
          
          <Card className={cn("border-none shadow-2xl", darkMode ? "bg-slate-900 shadow-none" : "bg-white shadow-slate-200")}>
            <CardHeader>
              <CardTitle className={darkMode ? "text-white" : ""}>Welcome Back</CardTitle>
              <CardDescription className={darkMode ? "text-slate-400" : ""}>Sign in with your Google account to start scanning.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleLogin} className="w-full" size="lg">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="mr-2 h-5 w-5" alt="Google" />
                Continue with Google
              </Button>
            </CardContent>
          </Card>
          
          <div className={cn("grid grid-cols-3 gap-4", darkMode ? "text-slate-500" : "text-slate-400")}>
            <div className="flex flex-col items-center space-y-1">
              <Mail className="h-5 w-5" />
              <span className="text-xs">Emails</span>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs">SMS</span>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <LinkIcon className="h-5 w-5" />
              <span className="text-xs">URLs</span>
            </div>
          </div>

          <div className="pt-8 flex flex-col items-center space-y-3">
            <span className={cn("text-[10px] font-bold uppercase tracking-widest", darkMode ? "text-slate-600" : "text-slate-400")}>Security Insights</span>
            <div className="flex space-x-4">
              <div className={cn("flex items-center space-x-1", darkMode ? "text-slate-600" : "text-slate-500")}>
                <Globe className="h-3 w-3" />
                <span className="text-[10px] font-medium">Global DB</span>
              </div>
              <div className={cn("flex items-center space-x-1", darkMode ? "text-slate-600" : "text-slate-500")}>
                <Lock className="h-3 w-3" />
                <span className="text-[10px] font-medium">SSL Verify</span>
              </div>
              <div className={cn("flex items-center space-x-1", darkMode ? "text-slate-600" : "text-slate-500")}>
                <ShieldAlert className="h-3 w-3" />
                <span className="text-[10px] font-medium">Zero-Day</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col items-center space-y-1 opacity-70">
            <div className="flex items-center space-x-2 text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">No Scam Active</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen transition-colors duration-300", darkMode ? "bg-slate-950" : "bg-slate-50")}>
      {/* Sidebar / Navigation */}
      <nav className={cn("fixed left-0 top-0 z-50 flex h-full w-20 flex-col items-center border-r py-8 md:w-64 transition-colors duration-300", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
        <div className="mb-10 flex items-center space-x-3 px-4">
          <div className={cn("rounded-lg p-2", darkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-600 text-white")}>
            <Shield className="h-6 w-6" />
          </div>
          <div className="hidden flex-col md:flex">
            <span className={cn("text-xl font-bold tracking-tight leading-none", darkMode ? "text-white" : "text-slate-900")}>Phish Hunter</span>
            <span className="text-[10px] font-bold tracking-[0.1em] text-blue-600 uppercase">Developers</span>
          </div>
        </div>

        <div className="flex w-full flex-1 flex-col space-y-2 px-3">
          <Button 
            variant={activeTab === 'dashboard' ? 'primary' : 'ghost'} 
            className={cn("justify-start", activeTab !== 'dashboard' && (darkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500"))}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard className="mr-2 h-5 w-5" />
            <span className="hidden md:block">Dashboard</span>
          </Button>
          <Button 
            variant={activeTab === 'history' ? 'primary' : 'ghost'} 
            className={cn("justify-start", activeTab !== 'history' && (darkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500"))}
            onClick={() => setActiveTab('history')}
          >
            <History className="mr-2 h-5 w-5" />
            <span className="hidden md:block">Scan History</span>
          </Button>
          
          <div className="pt-4 px-3">
            <Button 
              variant="ghost" 
              className={cn("w-full justify-start", darkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500")}
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? <Sun className="mr-2 h-5 w-5" /> : <Moon className="mr-2 h-5 w-5" />}
              <span className="hidden md:block">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </Button>
          </div>
        </div>

        <div className="mt-auto w-full px-3">
          <div className={cn("mb-6 hidden flex-col space-y-3 px-1 md:flex")}>
            <span className={cn("text-[10px] font-bold uppercase tracking-widest", darkMode ? "text-slate-600" : "text-slate-400")}>Security Tools</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Link2, label: 'Unshorten' },
                { icon: FileSearch, label: 'Headers' },
                { icon: Globe, label: 'WHOIS' },
                { icon: Lock, label: 'SSL Check' },
                { icon: Zap, label: 'Fast Scan' },
                { icon: Activity, label: 'Live Feed' },
                { icon: Fingerprint, label: 'Auth ID' },
                { icon: Cpu, label: 'AI Core' }
              ].map((tool, idx) => (
                <button 
                  key={idx}
                  onClick={() => {
                    setSelectedTool(tool.label);
                    setToolInput('');
                    setToolResult(null);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border p-2 transition-all group",
                    darkMode 
                      ? "bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800" 
                      : "bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50/50"
                  )}
                >
                  <tool.icon className={cn(
                    "mb-1 h-4 w-4 transition-colors",
                    darkMode ? "text-slate-500 group-hover:text-white" : "text-slate-400 group-hover:text-blue-500"
                  )} />
                  <span className={cn(
                    "text-[9px] font-medium transition-colors",
                    darkMode ? "text-slate-500 group-hover:text-slate-300" : "text-slate-500 group-hover:text-blue-600"
                  )}>{tool.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={cn(
            "mb-4 hidden flex-col items-center space-y-1 rounded-xl p-3 border md:flex",
            darkMode ? "bg-emerald-900/20 border-emerald-900/30" : "bg-emerald-50/50 border-emerald-100"
          )}>
            <div className="flex items-center space-x-2 text-emerald-600">
              <ShieldCheck className="h-3 w-3" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">No Scam Active</span>
            </div>
            <p className="text-[10px] font-medium text-emerald-700">System Protected</p>
          </div>

          <div className={cn(
            "mb-4 hidden flex-col items-center space-y-2 rounded-xl p-4 md:flex",
            darkMode ? "bg-slate-800" : "bg-slate-50"
          )}>
            <img src={user.photoURL || ''} className="h-10 w-10 rounded-full border-2 border-blue-500/20" alt={user.displayName || ''} />
            <div className="text-center">
              <p className={cn("text-sm font-medium", darkMode ? "text-white" : "text-slate-900")}>{user.displayName}</p>
              <p className={cn("text-xs truncate w-40", darkMode ? "text-slate-500" : "text-slate-500")}>{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600" onClick={handleLogout}>
            <LogOut className="mr-2 h-5 w-5" />
            <span className="hidden md:block">Logout</span>
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="ml-20 min-h-screen p-4 md:ml-64 md:p-8 lg:p-12">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h2 className={cn("text-3xl font-bold", darkMode ? "text-white" : "text-slate-900")}>
              {activeTab === 'dashboard' ? 'Analyze Threat' : 'Scan History'}
            </h2>
            <p className={darkMode ? "text-slate-400" : "text-slate-500"}>
              {activeTab === 'dashboard' 
                ? 'Scan suspicious content to detect phishing attempts.' 
                : 'Review your previous scans and risk assessments.'}
            </p>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid gap-8 lg:grid-cols-12"
            >
              {/* Input Section */}
              <div className="space-y-6 lg:col-span-7">
                {/* Security Overview Stats */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Card className={cn("border-none p-4 shadow-sm", darkMode ? "bg-slate-900" : "bg-white")}>
                    <div className="flex items-center space-x-3">
                      <div className={cn("rounded-lg p-2", darkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600")}>
                        <Search className="h-5 w-5" />
                      </div>
                      <div>
                        <p className={cn("text-xs font-medium", darkMode ? "text-slate-500" : "text-slate-500")}>Total Scans</p>
                        <p className={cn("text-xl font-bold", darkMode ? "text-white" : "text-slate-900")}>{stats.total}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className={cn("border-none p-4 shadow-sm", darkMode ? "bg-slate-900" : "bg-white")}>
                    <div className="flex items-center space-x-3">
                      <div className={cn("rounded-lg p-2", darkMode ? "bg-red-900/30 text-red-400" : "bg-red-50 text-red-600")}>
                        <ShieldAlert className="h-5 w-5" />
                      </div>
                      <div>
                        <p className={cn("text-xs font-medium", darkMode ? "text-slate-500" : "text-slate-500")}>Phishing Detected</p>
                        <p className={cn("text-xl font-bold", darkMode ? "text-white" : "text-slate-900")}>{stats.percentage}%</p>
                      </div>
                    </div>
                  </Card>
                  <Card className={cn("border-none p-4 shadow-sm", darkMode ? "bg-slate-900" : "bg-white")}>
                    <div className="flex items-center space-x-3">
                      <div className={cn("rounded-lg p-2", darkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-600")}>
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className={cn("text-xs font-medium", darkMode ? "text-slate-500" : "text-slate-500")}>Safe Scans</p>
                        <p className={cn("text-xl font-bold", darkMode ? "text-white" : "text-slate-900")}>{stats.low}</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Risk Distribution Bar */}
                {stats.total > 0 && (
                  <Card className={cn("border-none p-4 shadow-sm", darkMode ? "bg-slate-900" : "bg-white")}>
                    <div className="space-y-2">
                      <div className={cn("flex items-center justify-between text-xs font-medium", darkMode ? "text-slate-500" : "text-slate-500")}>
                        <span>Risk Distribution</span>
                        <span>{stats.total} Total Scans</span>
                      </div>
                      <div className={cn("flex h-2 w-full overflow-hidden rounded-full", darkMode ? "bg-slate-800" : "bg-slate-100")}>
                        <div 
                          className="bg-red-500 transition-all duration-500" 
                          style={{ width: `${(stats.high / stats.total) * 100}%` }} 
                        />
                        <div 
                          className="bg-amber-500 transition-all duration-500" 
                          style={{ width: `${(stats.medium / stats.total) * 100}%` }} 
                        />
                        <div 
                          className="bg-emerald-500 transition-all duration-500" 
                          style={{ width: `${(stats.low / stats.total) * 100}%` }} 
                        />
                      </div>
                      <div className={cn("flex items-center space-x-4 text-[10px] font-medium", darkMode ? "text-slate-600" : "text-slate-400")}>
                        <div className="flex items-center"><div className="mr-1 h-2 w-2 rounded-full bg-red-500" /> High ({stats.high})</div>
                        <div className="flex items-center"><div className="mr-1 h-2 w-2 rounded-full bg-amber-500" /> Medium ({stats.medium})</div>
                        <div className="flex items-center"><div className="mr-1 h-2 w-2 rounded-full bg-emerald-500" /> Low ({stats.low})</div>
                      </div>
                    </div>
                  </Card>
                )}

                <Card className={cn("overflow-hidden border-none shadow-xl", darkMode ? "bg-slate-900" : "shadow-slate-200")}>
                  <div className={cn("flex border-b", darkMode ? "border-slate-800" : "border-slate-100")}>
                    <button 
                      className={cn(
                        "flex flex-1 items-center justify-center py-4 text-sm font-medium transition-colors",
                        scanType === 'email' ? (darkMode ? "bg-blue-900/20 text-blue-400 border-b-2 border-blue-500" : "bg-blue-50 text-blue-600 border-b-2 border-blue-600") : (darkMode ? "text-slate-500 hover:bg-slate-800 hover:text-slate-300" : "text-slate-500 hover:bg-slate-50")
                      )}
                      onClick={() => setScanType('email')}
                    >
                      <Mail className="mr-2 h-4 w-4" /> Email
                    </button>
                    <button 
                      className={cn(
                        "flex flex-1 items-center justify-center py-4 text-sm font-medium transition-colors",
                        scanType === 'sms' ? (darkMode ? "bg-blue-900/20 text-blue-400 border-b-2 border-blue-500" : "bg-blue-50 text-blue-600 border-b-2 border-blue-600") : (darkMode ? "text-slate-500 hover:bg-slate-800 hover:text-slate-300" : "text-slate-500 hover:bg-slate-50")
                      )}
                      onClick={() => setScanType('sms')}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" /> SMS
                    </button>
                    <button 
                      className={cn(
                        "flex flex-1 items-center justify-center py-4 text-sm font-medium transition-colors",
                        scanType === 'url' ? (darkMode ? "bg-blue-900/20 text-blue-400 border-b-2 border-blue-500" : "bg-blue-50 text-blue-600 border-b-2 border-blue-600") : (darkMode ? "text-slate-500 hover:bg-slate-800 hover:text-slate-300" : "text-slate-500 hover:bg-slate-50")
                      )}
                      onClick={() => setScanType('url')}
                    >
                      <LinkIcon className="mr-2 h-4 w-4" /> URL
                    </button>
                  </div>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className={cn("text-sm font-semibold", darkMode ? "text-slate-300" : "text-slate-700")}>
                          {scanType === 'url' ? 'Enter URL to scan' : `Paste ${scanType} content`}
                        </label>
                        <span className="text-xs text-slate-400">{inputContent.length} characters</span>
                      </div>
                      
                      {scanType === 'url' ? (
                        <Input 
                          placeholder="https://suspicious-link.com/verify-account" 
                          value={inputContent}
                          onChange={(e) => setInputContent(e.target.value)}
                          className={cn("h-12 text-lg", darkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" : "")}
                        />
                      ) : (
                        <Textarea 
                          placeholder={`Paste the suspicious ${scanType} content here...`}
                          value={inputContent}
                          onChange={(e) => setInputContent(e.target.value)}
                          className={cn("min-h-[200px] resize-none text-base", darkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" : "bg-slate-50")}
                        />
                      )}

                      <Button 
                        className="w-full" 
                        size="lg" 
                        onClick={handleAnalyze} 
                        isLoading={isAnalyzing}
                        disabled={!inputContent.trim()}
                      >
                        <Search className="mr-2 h-5 w-5" />
                        Analyze for Threats
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Tips */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card className="bg-amber-50 border-amber-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center text-sm text-amber-800">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Common Red Flags
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-amber-700 space-y-1">
                      <li>Urgent or threatening language</li>
                      <li>Requests for sensitive information</li>
                      <li>Mismatched sender email addresses</li>
                      <li>Generic greetings (e.g., "Dear Customer")</li>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-50 border-emerald-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center text-sm text-emerald-800">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Safe Practices
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-emerald-700 space-y-1">
                      <li>Enable Two-Factor Authentication</li>
                      <li>Check URLs before clicking</li>
                      <li>Use official apps or websites</li>
                      <li>Report suspicious messages</li>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Result Section */}
              <div className="lg:col-span-5">
                <AnimatePresence mode="wait">
                  {currentResult ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-6"
                    >
                      <Card className={cn(
                        "border-none shadow-2xl",
                        currentResult.riskLevel === 'High' ? "bg-red-50" : 
                        currentResult.riskLevel === 'Medium' ? "bg-amber-50" : "bg-emerald-50"
                      )}>
                        <CardHeader className="text-center">
                          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
                            {currentResult.riskLevel === 'High' ? (
                              <ShieldAlert className="h-10 w-10 text-red-600" />
                            ) : currentResult.riskLevel === 'Medium' ? (
                              <AlertTriangle className="h-10 w-10 text-amber-600" />
                            ) : (
                              <ShieldCheck className="h-10 w-10 text-emerald-600" />
                            )}
                          </div>
                          <CardTitle className={cn(
                            "text-3xl font-bold",
                            currentResult.riskLevel === 'High' ? "text-red-700" : 
                            currentResult.riskLevel === 'Medium' ? "text-amber-700" : "text-emerald-700"
                          )}>
                            {currentResult.riskLevel} Risk Detected
                          </CardTitle>
                          <CardDescription className="text-slate-600">
                            Risk Score: <span className="font-bold">{currentResult.riskScore}/100</span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="rounded-lg bg-white/50 p-4">
                            <h4 className="mb-2 text-sm font-bold text-slate-900">Why was this flagged?</h4>
                            <ul className="space-y-2">
                              {currentResult.reasons.map((reason, i) => (
                                <li key={i} className="flex items-start text-sm text-slate-700">
                                  <ChevronRight className="mr-1 h-4 w-4 mt-0.5 flex-shrink-0 text-slate-400" />
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-lg bg-white/50 p-4">
                            <h4 className="mb-2 text-sm font-bold text-slate-900">Analysis Details</h4>
                            <div className="prose prose-sm max-w-none text-slate-700">
                              <ReactMarkdown>{currentResult.explanation}</ReactMarkdown>
                            </div>
                          </div>

                          <div className="rounded-lg bg-white/50 p-4">
                            <h4 className="mb-2 text-sm font-bold text-slate-900">Safe Alternatives</h4>
                            <ul className="space-y-2">
                              {currentResult.safeAlternatives.map((alt, i) => (
                                <li key={i} className="flex items-start text-sm text-emerald-700">
                                  <CheckCircle className="mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
                                  {alt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : isAnalyzing ? (
                    <Card className="flex h-[500px] flex-col items-center justify-center border-none shadow-xl shadow-slate-200">
                      <div className="relative mb-6 h-24 w-24">
                        <div className="absolute inset-0 animate-ping rounded-full bg-blue-100" />
                        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-blue-50">
                          <Shield className="h-10 w-10 animate-pulse text-blue-600" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">AI Analysis in Progress</h3>
                      <p className="text-slate-500">Scanning for phishing patterns and malicious signatures...</p>
                    </Card>
                  ) : (
                    <Card className="flex h-[500px] flex-col items-center justify-center border-dashed border-slate-200 bg-transparent">
                      <div className="mb-4 rounded-full bg-slate-100 p-4">
                        <Info className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-600">No Scan Active</h3>
                      <p className="text-center text-sm text-slate-400 max-w-[250px]">
                        Input content on the left to start your real-time security analysis.
                      </p>
                    </Card>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {history.length === 0 ? (
                <Card className="flex h-64 flex-col items-center justify-center border-dashed">
                  <History className="mb-2 h-10 w-10 text-slate-300" />
                  <p className="text-slate-500">No scan history found.</p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {history.map((record) => (
                    <Card key={record.id} className="group overflow-hidden transition-all hover:shadow-md">
                      <div className="flex flex-col md:flex-row md:items-center">
                        <div className={cn(
                          "w-2 md:h-24 md:w-2",
                          record.riskLevel === 'High' ? "bg-red-500" : 
                          record.riskLevel === 'Medium' ? "bg-amber-500" : "bg-emerald-500"
                        )} />
                        <CardHeader className="flex-1 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="rounded-lg bg-slate-100 p-2">
                                {record.type === 'email' ? <Mail className="h-4 w-4" /> : 
                                 record.type === 'sms' ? <MessageSquare className="h-4 w-4" /> : 
                                 <LinkIcon className="h-4 w-4" />}
                              </div>
                              <div>
                                <CardTitle className="text-base">{record.type.toUpperCase()} Scan</CardTitle>
                                <CardDescription className="text-xs">
                                  {record.timestamp?.toDate().toLocaleString() || 'Just now'}
                                </CardDescription>
                              </div>
                            </div>
                            <Badge variant={
                              record.riskLevel === 'High' ? 'destructive' : 
                              record.riskLevel === 'Medium' ? 'warning' : 'success'
                            }>
                              {record.riskLevel} Risk ({record.riskScore})
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 py-4 md:border-l md:border-slate-100">
                          <p className="line-clamp-2 text-sm text-slate-600 italic">
                            "{record.content}"
                          </p>
                        </CardContent>
                        <CardFooter className="py-4 md:border-l md:border-slate-100">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setCurrentResult(record);
                            setScanType(record.type);
                            setInputContent(record.content);
                            setActiveTab('dashboard');
                          }}>
                            View Details <ExternalLink className="ml-2 h-3 w-3" />
                          </Button>
                        </CardFooter>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Tool Modal */}
        <AnimatePresence>
          {selectedTool && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={cn(
                  "relative w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl",
                  darkMode ? "bg-slate-900 border border-slate-800" : "bg-white"
                )}
              >
                <div className={cn(
                  "flex items-center justify-between border-b p-4",
                  darkMode ? "border-slate-800" : "border-slate-100"
                )}>
                  <div className="flex items-center space-x-3">
                    <div className={cn("rounded-lg p-2", darkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600")}>
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={cn("font-bold", darkMode ? "text-white" : "text-slate-900")}>{selectedTool} Tool</h3>
                      <p className={cn("text-xs", darkMode ? "text-slate-500" : "text-slate-500")}>Advanced Security Analysis</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedTool(null)}>
                    <LogOut className="h-4 w-4 rotate-180" />
                  </Button>
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className={cn("text-sm font-semibold", darkMode ? "text-slate-300" : "text-slate-700")}>
                        Input for Analysis
                      </label>
                      <div className="flex space-x-2">
                        <Input 
                          placeholder={`Enter URL, domain, or snippet for ${selectedTool}...`}
                          value={toolInput}
                          onChange={(e) => setToolInput(e.target.value)}
                          className={cn(darkMode ? "bg-slate-800 border-slate-700 text-white" : "")}
                        />
                        <Button 
                          onClick={handleRunTool} 
                          isLoading={isToolRunning}
                          disabled={!toolInput.trim()}
                        >
                          Run
                        </Button>
                      </div>
                    </div>

                    {toolResult && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "rounded-xl border p-4",
                          toolResult.status === 'Danger' ? "bg-red-500/10 border-red-500/20" :
                          toolResult.status === 'Warning' ? "bg-amber-500/10 border-amber-500/20" :
                          toolResult.status === 'Safe' ? "bg-emerald-500/10 border-emerald-500/20" :
                          "bg-blue-500/10 border-blue-500/20"
                        )}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className={cn(
                            "font-bold",
                            toolResult.status === 'Danger' ? "text-red-400" :
                            toolResult.status === 'Warning' ? "text-amber-400" :
                            toolResult.status === 'Safe' ? "text-emerald-400" :
                            "text-blue-400"
                          )}>
                            {toolResult.title}
                          </h4>
                          <Badge variant={
                            toolResult.status === 'Danger' ? 'destructive' :
                            toolResult.status === 'Warning' ? 'warning' :
                            toolResult.status === 'Safe' ? 'success' : 'secondary'
                          }>
                            {toolResult.status}
                          </Badge>
                        </div>
                        <p className={cn("mb-4 text-sm font-medium", darkMode ? "text-slate-300" : "text-slate-700")}>
                          {toolResult.summary}
                        </p>
                        <div className={cn(
                          "prose prose-sm max-w-none rounded-lg p-3",
                          darkMode ? "bg-slate-950/50 text-slate-400 prose-invert" : "bg-white/50 text-slate-600"
                        )}>
                          <ReactMarkdown>{toolResult.details}</ReactMarkdown>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="ml-20 border-t border-slate-200 bg-white p-6 md:ml-64">
        <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
          <div className="flex items-center space-x-4 text-slate-500">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Phish Hunter AI © 2026</span>
            </div>
            <div className="hidden h-4 w-px bg-slate-200 md:block" />
            <div className="flex items-center space-x-1.5 text-slate-400">
              <Code className="h-3 w-3" />
              <span className="text-xs font-medium">Developed by Vinay CVK</span>
            </div>
          </div>
          <div className="flex space-x-6 text-xs text-slate-400">
            <a href="#" className="hover:text-blue-600">Privacy Policy</a>
            <a href="mailto:vinaykumarchukka1@gmail.com" className="hover:text-blue-600">Support: vinaykumarchukka1@gmail.com</a>
            <a href="#" className="hover:text-blue-600">Terms of Service</a>
            <a href="#" className="hover:text-blue-600">Security Center</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
