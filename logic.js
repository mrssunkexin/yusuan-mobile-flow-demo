(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.YusuanLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function sourceTypeForRole(role) {
    if (role === '一级代理商') return '库存车';
    if (role === '4S店员工') return '一手车源';
    return null;
  }

  function createPriceState(referencePrice) {
    return { referencePrice, salePrice: referencePrice };
  }

  function updateSalePrice(state, salePrice) {
    return { referencePrice: state.referencePrice, salePrice };
  }

  function searchOwnVehicles(records, ownerId, keyword) {
    const normalized = String(keyword || '').trim().toLowerCase();
    return records.filter((record) => {
      if (record.ownerId !== ownerId) return false;
      if (!normalized) return true;
      return [record.brand, record.model, record.variant, record.note]
        .some((value) => String(value || '').toLowerCase().includes(normalized));
    });
  }

  function nextBatch(records, offset, size = 20) {
    return records.slice(offset, offset + size);
  }

  function unlistVehicle(records, targetId, unlistedAt) {
    return records.map((record) => record.id === targetId
      ? { ...record, status: '已下架', unlistedAt }
      : { ...record });
  }

  function relistVehicle(records, targetId, relistedAt) {
    return records.map((record) => record.id === targetId
      ? {
          ...record,
          status: '在售',
          relistedAt,
          statusHistory: [...(record.statusHistory || []), { status: '在售', at: relistedAt }]
        }
      : { ...record });
  }

  function mergeVehiclePhotos(existingPhotos = [], sourcePhotos = []) {
    return [...new Set([...existingPhotos, ...sourcePhotos])].slice(0, 9);
  }

  function registrationDecision({ role, contactId }) {
    const sourceType = sourceTypeForRole(role);
    if (!sourceType) return { allowed: false, reason: '当前账号不能使用库存车登记功能' };
    return { allowed: true, sourceType };
  }

  function resolveSavedContact(savedSnapshot, availableContacts) {
    if (!savedSnapshot) return null;
    const current = availableContacts.find((item) => item.id === savedSnapshot.id);
    return current
      ? { ...current, selectable: true, departed: false }
      : { ...savedSnapshot, selectable: false, departed: true };
  }

  function employeePhoneDecision({ usedByOtherRole }) {
    if (usedByOtherRole) {
      return {
        allowed: false,
        reason: '该手机号已属于其他账号，不能新增为4S店员工'
      };
    }
    return { allowed: true };
  }

  function normalizeIssueCategory(category = 'all') {
    const allowed = ['all', 'ai', 'missing', 'conflict', 'unknown'];
    if (!allowed.includes(category)) throw new Error(`不支持的问题分类：${category}`);
    return category;
  }

  function normalizeView(view) {
    const allowed = ['overview', 'inventory', 'stores', 'employees', 'home002', 'notice', 'contact', 'contact2', 'list008', 'login009', 'clue010', 'stock', 'user'];
    if (!allowed.includes(view)) throw new Error(`页面不在本次原型范围：${view}`);
    return view;
  }

  function remarkPreview(remark, limit = 10) {
    const text = String(remark || '').trim();
    if (!text) return '—';
    const characters = Array.from(text);
    return characters.length > limit ? `${characters.slice(0, limit).join('')}...` : text;
  }

  return {
    sourceTypeForRole,
    createPriceState,
    updateSalePrice,
    searchOwnVehicles,
    nextBatch,
    unlistVehicle,
    relistVehicle,
    mergeVehiclePhotos,
    registrationDecision,
    resolveSavedContact,
    employeePhoneDecision,
    normalizeIssueCategory,
    normalizeView,
    remarkPreview
  };
});
