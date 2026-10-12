export class AdvStorage {
  constructor(type = 'local') {
    this.storage = type === 'session' ? sessionStorage : localStorage;
  }
  set(key, value, ttl = null) {
    const now = new Date();
    const ttlMs = parseTimeStr(ttl);
    const expiry = ttlMs ? now.getTime() + ttlMs : null;
    const item = {
      value,
      expiry,
    };
    this.storage.setItem(key, JSON.stringify(item));
  }
  get(key) {
    const itemStr = this.storage.getItem(key);
    if (!itemStr) {
      return null;
    } else {
      try {
        const item = JSON.parse(itemStr);
        const now = new Date();
        if (item.expiry === null || now.getTime() < item.expiry) {
          return item.value;
        }
        this.storage.removeItem(key);
        return null;
      } catch (e) {
        this.storage.removeItem(key);
        return null;
      }
    }
  }
  has(key) {
    const itemStr = this.storage.getItem(key);
    if (!itemStr) {
      return false;
    } else {
      try {
        const item = JSON.parse(itemStr);
        const now = new Date();
        // 如果未设置过期时间，或者当前时间小于过期时间，则存在
        if (item.expiry === null || now.getTime() < item.expiry) {
          return true;
        }
        // 已过期，清理数据
        this.storage.removeItem(key);
        return false;
      } catch (e) {
        this.storage.removeItem(key);
        return false;
      }
    }
  }
  del(key) {
    this.storage.removeItem(key);
  }
  clear() {
    this.storage.clear();
  }
}
