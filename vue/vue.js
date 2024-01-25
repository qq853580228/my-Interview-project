class Vue {
  constructor(options) {
    this.$options = options;
    // 收集更新依赖
    this.$watchEvent = {};
    if (typeof options.beforeCreate === 'function') {
      options.beforeCreate.bind(this)();
    }
    this.$data = options.data;
    this.proxyData();
    // this.observe();
    if (typeof options.created === 'function') {
      options.created.bind(this)();
    }
    if (typeof options.beforeMount === 'function') {
      options.beforeMount.bind(this)();
    }
    this.$el = document.querySelector(options.el);
    this.compile(this.$el);
    if (typeof options.mounted === 'function') {
      options.mounted.bind(this)();
    }
  }
  // 触发data中的数据发生变化执行watch中的update
  // observe() {
  //   for (const key in this.$data) {
  //     if (Object.hasOwnProperty.call(this.$data, key)) {
  //       Object.defineProperty(this, key, {
  //         get() {
  //           return this.$data[key];
  //         },
  //         set(val) {
  //           if (val !== this.$data[key]) {
  //             this.$data[key] = val;
  //           }
  //         },
  //       });
  //     }
  //   }
  // }
  proxyData() {
    for (const key in this.$data) {
      if (Object.hasOwnProperty.call(this.$data, key)) {
        Object.defineProperty(this, key, {
          get() {
            return this.$data[key];
          },
          set(val) {
            if (val !== this.$data[key]) {
              this.$data[key] = val;
              if (this.$watchEvent[key]) {
                this.$watchEvent[key].forEach(item => {
                  item.update();
                });
              }
            }
          },
        });
      }
    }
  }
  compile(node) {
    node.childNodes.forEach(item => {
      if (item.nodeType === 1) {
        // 这是元素节点 如果有子节点 进行递归替换
        if (item.childNodes.length) {
          this.compile(item);
        }

        // 给元素绑定事件响应
        if (item.hasAttribute('@click')) {
          if (this.$options.methods) {
            let eventName = item.getAttribute('@click');
            eventName = eventName ? eventName.trim() : eventName;
            item.addEventListener('click', e => {
              this[eventName] = this.$options.methods[eventName].bind(this, e);
              this[eventName]();
            })
          }
        }

        // 判断元素是否使用了v-model
        if (item.hasAttribute('v-model')) {
          let vmKey = item.getAttribute('v-model');
          vmKey = vmKey ? vmKey.trim() : vmKey;
          if (Object.hasOwnProperty.call(this, vmKey)) {
            item.value = this[vmKey];
          }
          item.addEventListener('input', e => {
            this[vmKey] = e.target.value;
          })
        }

      } else if (item.nodeType === 3) {
        // 这是文本节点 如果有{{}}则正则进行替换成数据
        const reg = /\{\{(.*?)\}\}/g;
        // 给节点赋值
        item.textContent = item.textContent.replace(reg, (match, vmKey) => {
          // vmKey就是实例中data的属性
          vmKey = vmKey.trim();
          // 添加watcher收集依赖
          if (Object.hasOwnProperty.call(this, vmKey)) {
            const watch = new Watcher(this, vmKey, item, 'textContent');
            if (!this.$watchEvent[vmKey]) {
              this.$watchEvent[vmKey] = [];
            } 
            this.$watchEvent[vmKey].push(watch);
          }
          return this.$data[vmKey];
        });
      }
    });
  }
}

class Watcher {
  constructor(vm, key, node, attr) {
    // 实例对象
    this.vm = vm;
    // 属性
    this.key = key;
    // 元素
    this.node = node;
    // 改变文本内容的字符串类型
    this.attr = attr;
  }
  update() {
    this.node[this.attr] = this.vm[this.key];
  }
}