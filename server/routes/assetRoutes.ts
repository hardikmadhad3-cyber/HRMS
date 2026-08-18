import { Router, Request, Response } from 'express';
import { AssetService } from '../services/AssetService.js';
import { AuthUser } from '../../src/types/auth.js';

export const assetRouter = Router();

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
assetRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const metrics = await AssetService.getDashboardMetrics(companyId, actor);
    res.json({ success: true, data: metrics });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 2. Asset Categories
assetRouter.get('/categories', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const categories = await AssetService.getCategories(companyId);
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

assetRouter.post('/categories', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const category = await AssetService.createCategory(req.body, companyId, actor);
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

assetRouter.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const category = await AssetService.updateCategory(req.params.id, req.body, companyId, actor);
    res.json({ success: true, data: category });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 3. Asset Master
assetRouter.get('/master', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const assets = await AssetService.getAssets(companyId, actor, {
      categoryId: req.query.categoryId as string,
      status: req.query.status as any,
      condition: req.query.condition as any,
      currentEmployeeId: req.query.currentEmployeeId as string,
      search: req.query.search as string,
      scope: req.query.scope as any,
    });
    res.json({ success: true, data: assets });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

assetRouter.get('/master/:id', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const asset = await AssetService.getAssetById(req.params.id, companyId, actor);
    res.json({ success: true, data: asset });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

assetRouter.post('/master', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const asset = await AssetService.createAsset(req.body, companyId, actor);
    res.status(201).json({ success: true, data: asset });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

assetRouter.put('/master/:id', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const asset = await AssetService.updateAsset(req.params.id, req.body, companyId, actor);
    res.json({ success: true, data: asset });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 4. Asset Assignments & Returns
assetRouter.get('/assignments', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const assignments = await AssetService.getAssetAssignments(companyId, actor, {
      assetId: req.query.assetId as string,
      employeeId: req.query.employeeId as string,
      isReturned: req.query.isReturned !== undefined ? req.query.isReturned === 'true' : undefined,
    });
    res.json({ success: true, data: assignments });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

assetRouter.post('/master/:id/assign', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const assignment = await AssetService.assignAsset(req.params.id, req.body, companyId, actor);
    res.status(201).json({ success: true, data: assignment });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

assetRouter.post('/master/:id/return', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const assignment = await AssetService.returnAsset(req.params.id, req.body, companyId, actor);
    res.json({ success: true, data: assignment });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 5. Asset History
assetRouter.get('/master/:id/history', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const actor = getActor(req);
    const history = await AssetService.getAssetHistory(req.params.id, companyId, actor);
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});
