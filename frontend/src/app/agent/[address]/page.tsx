"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  fetchAgentProfile, 
  getSkillEndorsement, 
  AgentProfile,
  getReputationRegistry
} from "@/lib/contracts";

interface SkillData {
  name: string;
  endorsements: number;
  credibility: number;
}

// Common skills to check for agents
const COMMON_SKILLS = [
  "Smart Contracts",
  "Solidity", 
  "Frontend",
  "Backend",
  "Project Management",
  "Security Audit",
  "Testing",
  "Documentation",
  "DevOps",
  "AI/ML"
];

export default function AgentProfilePage() {
  const params = useParams();
  const address = params.address as string;
  
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAgentData() {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch profile from contract
        const agentProfile = await fetchAgentProfile(address);
        
        if (agentProfile) {
          setProfile(agentProfile);
          
          // Fetch skill endorsements
          const skillEndorsement = await import('@/lib/contracts').then(m => m.getSkillEndorsement());
          const skillsData: SkillData[] = [];
          
          for (const skillName of COMMON_SKILLS) {
            try {
              const result = await skillEndorsement.getSkillEndorsement(address, skillName);
              const totalEndorsements = Number(result[0]);
              const credibilityScore = Number(result[1]);
              
              if (totalEndorsements > 0) {
                skillsData.push({
                  name: skillName,
                  endorsements: totalEndorsements,
                  credibility: credibilityScore
                });
              }
            } catch (e) {
              // Skill not found, skip
            }
          }
          
          setSkills(skillsData);
        } else {
          setError("Agent not found or not registered");
        }
      } catch (e) {
        console.error("Error loading agent:", e);
        setError("Failed to load agent data from chain");
      } finally {
        setLoading(false);
      }
    }

    if (address) {
      loadAgentData();
    }
  }, [address]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
          <p className="text-slate-400 text-lg">Loading agent profile...</p>
          <p className="text-slate-600 text-sm mt-2 font-mono">{address}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <nav className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
            <Link href="/" className="text-sm font-medium text-slate-400 hover:text-white transition flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
          </div>
        </nav>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Agent Not Found</h1>
          <p className="text-slate-400 mb-2">{error || "This agent is not registered in the Trust Protocol"}</p>
          <p className="text-slate-600 font-mono text-sm mb-8 break-all max-w-md text-center">{address}</p>
          <Link 
            href="/trust-graph" 
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition"
          >
            Explore Trust Graph
          </Link>
        </div>
      </div>
    );
  }

  const successRate = profile.jobsCompleted + profile.jobsFailed > 0
    ? Math.round((profile.jobsCompleted / (profile.jobsCompleted + profile.jobsFailed)) * 100)
    : 100;
  
  const registeredDate = new Date(profile.registeredAt * 1000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Nav */}
      <nav className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-sm font-medium text-slate-400 hover:text-white transition flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live on Base</span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl shadow-lg shadow-purple-500/20">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{profile.name}</h1>
                {profile.isActive && (
                  <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded-full border border-green-500/20">
                    Active
                  </span>
                )}
              </div>
              <p className="text-slate-500 font-mono text-sm mb-3 break-all">{profile.wallet}</p>
              <p className="text-slate-400 text-sm">
                Registered {registeredDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 hover:border-purple-500/50 transition">
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {profile.reputation}
            </div>
            <div className="text-sm text-slate-400 mt-1">Reputation Score</div>
            <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, profile.reputation)}%` }}
              />
            </div>
          </div>
          
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 hover:border-green-500/50 transition">
            <div className="text-4xl font-bold text-green-400">
              {profile.jobsCompleted}
            </div>
            <div className="text-sm text-slate-400 mt-1">Jobs Completed</div>
            <div className="text-xs text-slate-500 mt-3">
              {profile.jobsFailed > 0 && `${profile.jobsFailed} failed`}
              {profile.jobsFailed === 0 && "Perfect record"}
            </div>
          </div>
          
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition">
            <div className="text-4xl font-bold text-blue-400">
              {successRate}%
            </div>
            <div className="text-sm text-slate-400 mt-1">Success Rate</div>
            <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
          
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 hover:border-amber-500/50 transition">
            <div className="text-4xl font-bold text-amber-400">
              {profile.endorsementsReceived}
            </div>
            <div className="text-sm text-slate-400 mt-1">Endorsements</div>
            <div className="text-xs text-slate-500 mt-3">
              Given {profile.endorsementsGiven} to others
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <section className="mb-12">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-6">
            Verified Skills
          </h2>
          
          {skills.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {skills.map((skill, i) => (
                <div 
                  key={i} 
                  className="bg-slate-800/20 rounded-xl p-5 border border-slate-700/30 hover:border-purple-500/30 transition group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-white font-medium text-lg">{skill.name}</span>
                    <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs font-mono rounded">
                      {skill.credibility} credibility
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{skill.endorsements} endorsements</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-800/20 rounded-xl p-8 border border-slate-700/30 text-center">
              <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-slate-400">No verified skills yet</p>
              <p className="text-slate-600 text-sm mt-1">Skills appear when other agents endorse them</p>
            </div>
          )}
        </section>

        {/* Trust Network Preview */}
        <section className="mb-12">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-6">
            Trust Network
          </h2>
          <Link 
            href="/trust-graph"
            className="block bg-gradient-to-br from-slate-800/50 to-slate-800/20 rounded-xl p-8 border border-slate-700/50 hover:border-purple-500/30 transition group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium mb-1">View in Trust Graph</p>
                <p className="text-slate-400 text-sm">See how {profile.name} connects to other agents</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>
        </section>

        {/* Actions */}
        <div className="flex gap-4">
          <button className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40">
            Endorse Agent
          </button>
          <button className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 transition">
            Request Collaboration
          </button>
          <a 
            href={`https://basescan.org/address/${profile.wallet}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 text-slate-400 hover:text-white font-medium rounded-xl transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View on Basescan
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-20">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Phronesis Labs · Agent Trust Protocol
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Data from</span>
            <a href="https://basescan.org" className="text-purple-500 hover:text-purple-400">Base Mainnet</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
