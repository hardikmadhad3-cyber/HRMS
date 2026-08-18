import { Router, Request, Response } from 'express';
import { OffboardingService } from '../services/OffboardingService.js';
import { AuthUser } from '../../src/types/auth.js';

export const offboardingRouter = Router();

function getActor(req: Request): AuthUser {
  return (req as any).user as AuthUser;
}

function getCompanyId(req: Request): string {
  const compId = req.headers['x-company-id'] as string;
  if (!compId) {
    throw new Error('X-Company-Id header is required.');
  }
  return compId;
}

// 1. Dashboard Metrics
offboardingRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const metrics = await OffboardingService.getDashboardMetrics(companyId, actor);
    res.json({ success: true, data: metrics });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 2. Offboarding Requests (Query, Get by ID)
offboardingRouter.get('/requests', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const requests = await OffboardingService.getOffboardingRequests(companyId, actor, {
      employeeId: req.query.employeeId as string,
      status: req.query.status as any,
      scope: req.query.scope as any,
    });
    res.json({ success: true, data: requests });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

offboardingRouter.get('/requests/:id', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const request = await OffboardingService.getOffboardingById(req.params.id, companyId, actor);
    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// 3. Initiate Resignation (Self)
offboardingRouter.post('/resignation', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const request = await OffboardingService.initiateResignation(req.body, companyId, actor);
    res.status(201).json({ success: true, data: request });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 4. Initiate Termination (HR/Manager)
offboardingRouter.post('/termination', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const request = await OffboardingService.initiateTermination(req.body, companyId, actor);
    res.status(201).json({ success: true, data: request });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 5. Approve / Reject Offboarding
offboardingRouter.post('/requests/:id/approve', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const request = await OffboardingService.approveOffboarding(req.params.id, req.body, companyId, actor);
    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

offboardingRouter.post('/requests/:id/reject', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const request = await OffboardingService.rejectOffboarding(req.params.id, req.body, companyId, actor);
    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 6. Clearance Checklist Item Update
offboardingRouter.put('/clearance-items/:itemId', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const item = await OffboardingService.updateClearanceItem(req.params.itemId, req.body, companyId, actor);
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 7. Exit Interview
offboardingRouter.post('/requests/:id/exit-interview', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const interview = await OffboardingService.saveExitInterview(req.params.id, req.body, companyId, actor);
    res.status(201).json({ success: true, data: interview });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 8. Complete Offboarding
offboardingRouter.post('/requests/:id/complete', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const request = await OffboardingService.completeOffboarding(req.params.id, req.body, companyId, actor);
    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 9. Offboarding History
offboardingRouter.get('/requests/:id/history', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const history = await OffboardingService.getOffboardingHistory(req.params.id, companyId, actor);
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});
