import React, { useState, useEffect } from 'react';
import {
  Award,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  UserCheck,
  FileText,
  Search,
  Filter,
} from 'lucide-react';
import { JobOffer, OfferStatus } from '../../../types/recruitment.js';
import { recruitmentApi } from '../../../services/recruitmentApi.js';
import { useNotification } from '../../../context/NotificationContext.js';

interface JobOffersTabProps {
  onNavigateToOnboarding: (onboardingId?: string) => void;
}

export function JobOffersTab({ onNavigateToOnboarding }: JobOffersTabProps) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const res = await recruitmentApi.getOffers();
      if (res.success && res.data) {
        setOffers(res.data);
      }
    } catch (err) {
      console.error('Failed to load job offers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (offerId: string, status: OfferStatus) => {
    try {
      const res = await recruitmentApi.updateOfferStatus(offerId, status);
      if (res.success) {
        showToast('success', 'Offer Updated', `Job offer marked as ${status}`);
        loadOffers();
      } else {
        showToast('error', 'Update Failed', res.error || 'Failed to update offer status');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error updating offer status');
    }
  };

  const handleInitiateOnboarding = async (offerId: string) => {
    try {
      const res = await recruitmentApi.startOnboarding(offerId);
      if (res.success) {
        showToast('success', 'Onboarding Started', 'Employee Onboarding checklist initiated successfully!');
        onNavigateToOnboarding(res.data?.id);
      } else {
        showToast('error', 'Initiation Failed', res.error || 'Failed to initiate onboarding');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error initiating onboarding');
    }
  };

  const filteredOffers = offers.filter((o) => {
    return statusFilter === 'ALL' || o.status === statusFilter;
  });

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Filter Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
          >
            <option value="ALL">All Offers ({offers.length})</option>
            <option value={OfferStatus.DRAFT}>Draft</option>
            <option value={OfferStatus.PENDING_APPROVAL}>Pending Approval</option>
            <option value={OfferStatus.APPROVED}>Approved</option>
            <option value={OfferStatus.SENT}>Sent to Candidate</option>
            <option value={OfferStatus.ACCEPTED}>Accepted</option>
            <option value={OfferStatus.DECLINED}>Declined</option>
          </select>
        </div>
      </div>

      {/* Offers Cards / List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Job Offers Generated</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Generate formal job offers directly from the Candidate Pipeline when an applicant clears final interview rounds.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOffers.map((offer) => {
            return (
              <div
                key={offer.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  {/* Top line */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {offer.offerNumber}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">
                        {offer.candidateName || 'Candidate'}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">{offer.requisitionTitle || 'Role'}</p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        offer.status === OfferStatus.ACCEPTED
                          ? 'bg-emerald-100 text-emerald-800'
                          : offer.status === OfferStatus.SENT
                          ? 'bg-blue-100 text-blue-800'
                          : offer.status === OfferStatus.APPROVED
                          ? 'bg-purple-100 text-purple-800'
                          : offer.status === OfferStatus.DECLINED
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {offer.status}
                    </span>
                  </div>

                  {/* CTC Banner */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Total Annual Package
                      </span>
                      <div className="text-xl font-black text-slate-900">
                        ${offer.annualCtc.toLocaleString()} <span className="text-xs font-normal text-slate-500">({offer.currency}/yr)</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                      <div>Base: <span className="font-semibold">${offer.basicSalary.toLocaleString()}</span></div>
                      <div>Variable Bonus: <span className="font-semibold">${(offer.variableBonus || 0).toLocaleString()}</span></div>
                    </div>
                  </div>

                  {/* Dates Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Joining: <strong className="text-slate-800">{offer.joiningDate}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Expires: <strong className="text-slate-800">{offer.expiryDate || 'N/A'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Offer Action Buttons */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {offer.status === OfferStatus.DRAFT && (
                      <button
                        onClick={() => handleUpdateStatus(offer.id, OfferStatus.SENT)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        Send to Candidate
                      </button>
                    )}
                    {offer.status === OfferStatus.SENT && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(offer.id, OfferStatus.ACCEPTED)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                        >
                          Mark Accepted
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(offer.id, OfferStatus.DECLINED)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
                        >
                          Declined
                        </button>
                      </>
                    )}
                  </div>

                  {offer.status === OfferStatus.ACCEPTED && (
                    <button
                      onClick={() => handleInitiateOnboarding(offer.id)}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Initiate Onboarding
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
