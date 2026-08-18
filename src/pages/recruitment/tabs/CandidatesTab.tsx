import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  Building,
  DollarSign,
  Clock,
  Briefcase,
  ExternalLink,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { Candidate, CandidateSource } from '../../../types/recruitment.js';
import { recruitmentApi } from '../../../services/recruitmentApi.js';
import { useNotification } from '../../../context/NotificationContext.js';

interface CandidatesTabProps {
  onOpenCreateCandidate: () => void;
  onNavigateToPipeline: (candidateId?: string) => void;
}

export function CandidatesTab({
  onOpenCreateCandidate,
  onNavigateToPipeline,
}: CandidatesTabProps) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const res = await recruitmentApi.getCandidates();
      if (res.success && res.data) {
        setCandidates(res.data);
      }
    } catch (err) {
      console.error('Failed to load candidate pool:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.currentCompany && c.currentCompany.toLowerCase().includes(search.toLowerCase())) ||
      (c.skills && c.skills.some((s) => s.toLowerCase().includes(search.toLowerCase())));

    const matchesSource = sourceFilter === 'ALL' || c.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  return (
    <div className="space-y-5">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by candidate name, email, skills, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
          >
            <option value="ALL">All Sources ({candidates.length})</option>
            <option value={CandidateSource.LINKEDIN}>LinkedIn</option>
            <option value={CandidateSource.CAREER_PAGE}>Career Page</option>
            <option value={CandidateSource.REFERRAL}>Referral</option>
            <option value={CandidateSource.JOB_BOARD}>Job Board</option>
            <option value={CandidateSource.DIRECT}>Direct Sourcing</option>
            <option value={CandidateSource.AGENCY}>Agency</option>
          </select>
        </div>

        <button
          onClick={onOpenCreateCandidate}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Add Candidate
        </button>
      </div>

      {/* Candidate Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Candidates in Pool</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add talent profiles manually or connect recruitment job boards to populate your applicant pool.
          </p>
          <button
            onClick={onOpenCreateCandidate}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Candidate
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCandidates.map((cand) => (
            <div
              key={cand.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{cand.fullName}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {cand.currentDesignation || 'Candidate'} {cand.currentCompany ? `at ${cand.currentCompany}` : ''}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      cand.status === 'HIRED'
                        ? 'bg-purple-100 text-purple-800'
                        : cand.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {cand.status}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{cand.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cand.phone}</span>
                  </div>
                </div>

                {/* Experience & CTC Badges */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Experience</span>
                    <span className="font-semibold text-slate-800">{cand.experienceYears} Years</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Notice Period</span>
                    <span className="font-semibold text-slate-800">{cand.noticePeriodDays} Days</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Expected CTC</span>
                    <span className="font-semibold text-slate-800">
                      ${((cand.expectedCtc || 0) / 1000).toFixed(0)}k/yr
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Source</span>
                    <span className="font-semibold text-slate-800">{cand.source}</span>
                  </div>
                </div>

                {/* Skills tags */}
                {cand.skills && cand.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {cand.skills.slice(0, 4).map((s, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                      >
                        {s}
                      </span>
                    ))}
                    {cand.skills.length > 4 && (
                      <span className="text-[10px] font-medium text-slate-400 px-1 py-0.5">
                        +{cand.skills.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Added {new Date(cand.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => onNavigateToPipeline(cand.id)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  View In Pipeline <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
