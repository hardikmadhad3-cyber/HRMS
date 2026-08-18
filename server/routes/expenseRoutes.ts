import { Router, Request, Response } from 'express';
import { ExpenseService } from '../services/ExpenseService.js';
import { AuthUser } from '../../src/types/auth.js';

export const expenseRouter = Router();

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
expenseRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const metrics = await ExpenseService.getDashboardMetrics(companyId, actor);
    res.json({ success: true, data: metrics });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 2. Expense Categories
expenseRouter.get('/categories', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const activeOnly = req.query.activeOnly === 'true';
    const categories = await ExpenseService.getCategories(companyId, activeOnly);
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

expenseRouter.post('/categories', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const category = await ExpenseService.createCategory(req.body, companyId, actor);
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

expenseRouter.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const category = await ExpenseService.updateCategory(req.params.id, req.body, companyId, actor);
    res.json({ success: true, data: category });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 3. Expense Claims
expenseRouter.get('/claims', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const claims = await ExpenseService.getClaims(companyId, actor, {
      employeeId: req.query.employeeId as string,
      status: req.query.status as any,
      scope: req.query.scope as any,
    });
    res.json({ success: true, data: claims });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

expenseRouter.get('/claims/:id', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const claim = await ExpenseService.getClaimById(req.params.id, companyId, actor);
    res.json({ success: true, data: claim });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

expenseRouter.post('/claims', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const claim = await ExpenseService.createClaim(req.body, companyId, actor);
    res.status(201).json({ success: true, data: claim });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

expenseRouter.put('/claims/:id', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const claim = await ExpenseService.updateClaim(req.params.id, req.body, companyId, actor);
    res.json({ success: true, data: claim });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

expenseRouter.post('/claims/:id/submit', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const claim = await ExpenseService.submitClaim(req.params.id, companyId, actor);
    res.json({ success: true, data: claim });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 4. Claim Items
expenseRouter.post('/claims/:id/items', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const item = await ExpenseService.addClaimItem(req.params.id, req.body, companyId, actor);
    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

expenseRouter.delete('/claims/:id/items/:itemId', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    await ExpenseService.removeClaimItem(req.params.id, req.params.itemId, companyId, actor);
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 5. Approval Actions
expenseRouter.post('/claims/:id/actions', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const claim = await ExpenseService.processApprovalAction(req.params.id, req.body, companyId, actor);
    res.json({ success: true, data: claim });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 6. Claim History / Audit
expenseRouter.get('/claims/:id/history', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const history = await ExpenseService.getClaimHistory(req.params.id, companyId, actor);
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});
