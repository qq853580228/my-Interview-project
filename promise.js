class MyPromise {
  state = 'pending'; // 状态：pending fulfilled rejected
  value = undefined;
  reason = undefined;
  resolveCallbacks = [];
  rejectCallbacks = [];
  constructor(fn) {
    const resolveHandler = value => {
      if (this.state === 'pending') {
        this.value = value;
        this.state = 'fulfilled';
        this.resolveCallbacks.forEach(fn => fn(this.value));
      }
    }
    const rejectHandler = reason => {
      if (this.state === 'pending') {
        this.reason = reason;
        this.state = 'rejected';
        this.rejectCallbacks.forEach(fn => fn(this.reason));
      }
    }
    try {
      fn(resolveHandler, rejectHandler);
    } catch (error) {
      rejectHandler(error);
    }
  }
  then(fn1, fn2) {
    fn1 = typeof fn1 === 'function' ? fn1 : v => v;
    fn2 = typeof fn2 === 'function' ? fn2 : r => r;
    if (this.state === 'pending') {
      return new MyPromise((resolve, reject) => {
        this.resolveCallbacks.push(() => {
          try {
            const newValue = fn1(this.value);
            resolve(newValue);
          } catch (error) {
            reject(error);
          }
        });
        this.rejectCallbacks.push(() => {
          try {
            const newReason = fn2(this.reason);
            reject(newReason);
          } catch (error) {
            reject(error);
          }
        });
      });
    }
    if (this.state === 'fulfilled') {
      return new MyPromise((resolve, reject) => {
        try {
          const newValue = fn1(this.value);
          resolve(newValue);
        } catch (error) {
          reject(error);
        }
      });
    }
    if (this.state === 'rejected') {
      return new MyPromise((resolve, reject) => {
        try {
          const newReason = fn2(this.reason);
          reject(newReason);
        } catch (error) {
          reject(error);
        }
      });
    }
  }
  catch(fn) {
    return this.then(null, fn);
  }
}
MyPromise.resolve = function(value) {
  return new MyPromise(resolve => resolve(value));
};
MyPromise.reject = function(reason) {
  return new MyPromise((resolve, reject) => reject(reason));
};
MyPromise.all = function(promiseList = []) {
  return new MyPromise((resolve, reject) => {
    const result = [];
    promiseList.forEach(p => {
      p.then(res => {
        result.push(res);
        if (result.length == promiseList.length) {
          resolve(result);
        }
      }).catch(err => {
        reject(err);
      })
    })
  });
}
MyPromise.race = function(promiseList = []) {
  return new MyPromise((resolve, reject) => {
    let resolveFlag = false;
    promiseList.forEach(p => {
      p.then(res => {
        if (!resolveFlag) {
          resolveFlag = true;
          resolve(res);
        }
      }).catch(err => {
        reject(err);
      })
    })
  });
}