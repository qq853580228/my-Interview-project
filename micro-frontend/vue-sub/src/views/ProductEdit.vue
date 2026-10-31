<script setup lang="ts">
  import { reactive, computed, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { message } from 'ant-design-vue'
  import { loadProducts, addProduct, updateProduct } from '../shared/mockDb'
  import { PRODUCT_ON, PRODUCT_OFF, PRODUCT_STATUS_LABELS, type ProductStatus } from '../shared/contract'

  const route = useRoute()
  const router = useRouter()

  const editId = computed(() => (route.params.id as string) ?? '')
  const isEdit = computed(() => !!editId.value)

  const form = reactive({
    name: '',
    price: 0,
    stock: 0,
    status: PRODUCT_ON as ProductStatus,
  })

  const rules = {
    name: [{ required: true, message: '商品名称必填', trigger: 'blur' }],
    price: [
      {
        validator: (_rule: unknown, value: number) =>
          Number(value) > 0 ? Promise.resolve() : Promise.reject('价格必须为大于 0 的数字'),
      },
    ],
    stock: [
      {
        validator: (_rule: unknown, value: number) =>
          Number.isInteger(Number(value)) && Number(value) >= 0
            ? Promise.resolve()
            : Promise.reject('库存必须为 >= 0 的整数'),
      },
    ],
  }

  const statusOptions = [
    { value: PRODUCT_ON, label: PRODUCT_STATUS_LABELS[PRODUCT_ON] },
    { value: PRODUCT_OFF, label: PRODUCT_STATUS_LABELS[PRODUCT_OFF] },
  ]

  onMounted(() => {
    if (!isEdit.value) return
    const existing = loadProducts().find((p) => p.id === editId.value)
    if (existing) {
      form.name = existing.name
      form.price = existing.price
      form.stock = existing.stock
      form.status = existing.status
    } else {
      message.error(`未找到商品 ${editId.value}`)
    }
  })

  function handleSave(): void {
    if (isEdit.value) {
      updateProduct({
        id: editId.value,
        name: form.name.trim(),
        price: Number(form.price),
        stock: Number(form.stock),
        status: form.status,
        updatedAt: Date.now(),
      })
      message.success('商品已更新')
    } else {
      addProduct({
        id: `P${Date.now()}`,
        name: form.name.trim(),
        price: Number(form.price),
        stock: Number(form.stock),
        status: form.status,
        updatedAt: Date.now(),
      })
      message.success('商品已创建')
    }
    router.push('/products')
  }

  function handleCancel(): void {
    router.push('/products')
  }
</script>

<template>
  <div class="page">
    <a-card :title="isEdit ? `编辑商品 ${editId}` : '新增商品'" class="product-edit">
    <a-form
      :model="form"
      :rules="rules"
      layout="vertical"
      class="edit-form"
      @finish="handleSave"
    >
      <a-form-item label="名称" name="name">
        <a-input v-model:value="form.name" placeholder="请输入商品名称" />
      </a-form-item>
      <a-form-item label="价格" name="price">
        <a-input-number
          v-model:value="form.price"
          :min="0.01"
          :step="0.01"
          :precision="2"
          style="width: 100%"
          prefix="¥"
        />
      </a-form-item>
      <a-form-item label="库存" name="stock">
        <a-input-number v-model:value="form.stock" :min="0" :step="1" style="width: 100%" />
      </a-form-item>
      <a-form-item v-if="isEdit" label="状态" name="status">
        <a-select v-model:value="form.status" :options="statusOptions" />
      </a-form-item>
      <a-form-item>
        <a-space>
          <a-button type="primary" html-type="submit">保存</a-button>
          <a-button @click="handleCancel">取消</a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </a-card>
  </div>
</template>

<style scoped>
  .product-edit {
    max-width: 520px;
  }
</style>
