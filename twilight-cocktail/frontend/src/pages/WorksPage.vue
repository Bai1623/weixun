<template>
  <div class="works-page page-stack">
    <SectionHeading
      eyebrow="Works"
      title="我的作品"
      description="记录每天调过的酒、照片、原料和复盘。"
    />

    <div
      v-if="saveDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/75 px-4 backdrop-blur-sm"
      role="presentation"
      @click.self="closeSaveDialog"
    >
      <div
        class="w-full max-w-sm rounded-lg border border-gold/20 bg-walnut p-5 shadow-2xl shadow-black/40"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="saveDialogTitleId"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.22em] text-gold">
              {{ saveDialog.kind === 'success' ? 'Saved' : 'Notice' }}
            </p>
            <h3 :id="saveDialogTitleId" class="mt-2 font-display text-2xl text-cream">
              {{ saveDialog.title }}
            </h3>
          </div>
          <button
            class="rounded-md border border-gold/20 p-2 text-gold transition hover:bg-gold/10"
            type="button"
            aria-label="关闭提示"
            @click="closeSaveDialog"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <p class="mt-3 text-sm leading-6 text-muted">{{ saveDialog.message }}</p>
        <button
          class="mt-5 inline-flex w-full items-center justify-center rounded-md bg-gold px-4 py-3 text-sm font-semibold text-obsidian transition hover:bg-cream"
          type="button"
          @click="closeSaveDialog"
        >
          知道了
        </button>
      </div>
    </div>

    <div
      v-if="autoBackupPrompt"
      class="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/75 px-4 backdrop-blur-sm"
      role="presentation"
      @click.self="dismissAutoBackupPrompt"
    >
      <div
        class="w-full max-w-md rounded-lg border border-gold/20 bg-walnut p-5 shadow-2xl shadow-black/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auto-backup-dialog-title"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.22em] text-gold">CloudBase</p>
            <h3 id="auto-backup-dialog-title" class="mt-2 font-display text-2xl text-cream">
              自动备份提醒
            </h3>
          </div>
          <button
            class="rounded-md border border-gold/20 p-2 text-gold transition hover:bg-gold/10"
            type="button"
            aria-label="关闭自动备份提醒"
            @click="dismissAutoBackupPrompt"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <p class="mt-3 text-sm leading-6 text-muted">
          距离上次云端备份已超过 1 天。是否现在轻量同步当前账号数据到云端？
        </p>
        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            class="inline-flex items-center justify-center rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10"
            type="button"
            @click="dismissAutoBackupPrompt"
          >
            暂时不用
          </button>
          <button
            data-testid="auto-backup-confirm"
            class="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-3 text-sm font-semibold text-obsidian transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            :disabled="isSyncingCloud"
            @click="confirmAutoBackup"
          >
            <Upload class="h-4 w-4" />
            现在上传
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="newDrinkRequestPrompt"
      class="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/75 px-4 backdrop-blur-sm"
      role="presentation"
      @click.self="dismissDrinkRequestPrompt"
    >
      <div
        class="w-full max-w-md rounded-lg border border-gold/20 bg-walnut p-5 shadow-2xl shadow-black/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drink-request-dialog-title"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.22em] text-gold">ORDER</p>
            <h3 id="drink-request-dialog-title" class="mt-2 font-display text-2xl text-cream">
              朋友想喝提醒
            </h3>
          </div>
          <button
            class="rounded-md border border-gold/20 p-2 text-gold transition hover:bg-gold/10"
            type="button"
            aria-label="关闭朋友点单提醒"
            @click="dismissDrinkRequestPrompt"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <p class="mt-3 text-sm leading-6 text-muted">
          {{
            newDrinkRequestPrompt.count === 1
              ? '当前有一个朋友想喝，是否查看？'
              : `当前有 ${newDrinkRequestPrompt.count} 个新的朋友点单，是否查看？`
          }}
        </p>
        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            class="inline-flex items-center justify-center rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10"
            type="button"
            @click="dismissDrinkRequestPrompt"
          >
            稍后
          </button>
          <button
            data-testid="drink-request-view-new"
            class="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-3 text-sm font-semibold text-obsidian transition hover:bg-cream"
            type="button"
            @click="viewNewDrinkRequests"
          >
            查看
          </button>
        </div>
      </div>
    </div>

    <section class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form
        ref="workFormEl"
        class="rounded-lg border border-gold/15 bg-walnut/70 p-5"
        @submit.prevent
      >
        <div
          v-if="editingWorkId"
          class="mb-4 flex flex-col gap-3 rounded-lg border border-gold/15 bg-obsidian/45 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-cream">正在编辑作品，保存后会覆盖原记录。</p>
          <button
            class="inline-flex items-center justify-center gap-2 rounded-md border border-gold/30 px-3 py-2 text-sm text-gold transition hover:bg-gold/10"
            type="button"
            @click="cancelEdit"
          >
            <X class="h-4 w-4" />
            取消编辑
          </button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-2 text-sm text-muted">
            <span>调酒日期</span>
            <input
              ref="dateInput"
              v-model="form.madeAt"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream [color-scheme:dark] outline-none focus:ring-2 focus:ring-gold"
              type="date"
              @click="openDatePicker"
              @focus="openDatePicker"
            />
          </label>

          <label class="space-y-2 text-sm text-muted">
            <span>酒单</span>
            <input
              v-model.trim="cocktailSearch"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              placeholder="搜索酒单"
            />
            <select
              v-model="selectedSlug"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              @change="applyCocktail"
            >
              <option value="">自由记录</option>
              <option
                v-for="cocktail in cocktailOptions"
                :key="cocktail.value"
                :value="cocktail.value"
              >
                {{ cocktail.nameZh }}
              </option>
            </select>
          </label>
        </div>

        <label class="mt-4 block space-y-2 text-sm text-muted">
          <span>作品名称</span>
          <input
            v-model.trim="form.cocktailName"
            class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
            placeholder="例如 想见你 / 白桃乌龙 / 自由特调"
          />
        </label>

        <div class="mt-4 space-y-4 rounded-lg border border-gold/10 bg-obsidian/35 p-4">
          <span>原材料</span>
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs text-muted">基酒，可选，最多 4 种</p>
              <p class="text-xs text-gold">{{ selectedBaseLiquorCount }}/4</p>
            </div>
            <div class="grid gap-2 sm:grid-cols-4">
              <select
                v-for="index in 4"
                :key="index"
                v-model="form.ingredientGroups.baseLiquors[index - 1]"
                class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
                :aria-label="`基酒 ${index}`"
              >
                <option value="">无</option>
                <option
                  v-for="option in baseLiquorOptions"
                  :key="option"
                  :value="option"
                  :disabled="isBaseOptionDisabled(option, index - 1)"
                >
                  {{ option }}
                </option>
              </select>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-xs text-muted">调味酒</p>
            <input
              v-model.trim="flavorLiquorSearch"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              placeholder="搜索调味酒"
            />
            <select
              v-model="selectedFlavorLiquor"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              @change="addFlavorLiquor"
            >
              <option value="">选择调味酒</option>
              <option v-for="option in flavorLiquorOptions" :key="option" :value="option">
                {{ option === CUSTOM_OPTION_VALUE ? '自定义添加' : option }}
              </option>
            </select>
            <div v-if="isAddingFlavorLiquor" class="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                v-model.trim="customFlavorLiquorName"
                class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
                placeholder="输入自定义调味酒"
                @keydown.enter.prevent="saveCustomFlavorLiquor"
              />
              <button
                class="rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10"
                type="button"
                @click="saveCustomFlavorLiquor"
              >
                添加
              </button>
            </div>
            <div v-if="form.ingredientGroups.flavorLiquors.length" class="flex flex-wrap gap-2">
              <button
                v-for="item in form.ingredientGroups.flavorLiquors"
                :key="item"
                class="rounded-full bg-cream/10 px-3 py-1 text-xs text-cream transition hover:bg-wine/30"
                type="button"
                @click="removeFlavorLiquor(item)"
              >
                {{ item }} ×
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-xs text-muted">饮料类型</p>
            <input
              v-model.trim="beverageSearch"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              placeholder="搜索饮料"
            />
            <select
              v-model="selectedBeverage"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              @change="addBeverage"
            >
              <option value="">选择饮料</option>
              <option v-for="option in beverageOptions" :key="option" :value="option">
                {{ option === CUSTOM_OPTION_VALUE ? '自定义添加' : option }}
              </option>
            </select>
            <div v-if="isAddingBeverage" class="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                v-model.trim="customBeverageName"
                class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
                placeholder="输入自定义饮料"
                @keydown.enter.prevent="saveCustomBeverage"
              />
              <button
                class="rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10"
                type="button"
                @click="saveCustomBeverage"
              >
                添加
              </button>
            </div>
            <div v-if="form.ingredientGroups.beverages.length" class="flex flex-wrap gap-2">
              <button
                v-for="item in form.ingredientGroups.beverages"
                :key="item"
                class="rounded-full bg-gold/15 px-3 py-1 text-xs text-cream transition hover:bg-wine/30"
                type="button"
                @click="removeBeverage(item)"
              >
                {{ item }} ×
              </button>
            </div>
          </div>

          <label class="block space-y-2 text-sm text-muted">
            <span>其他</span>
            <textarea
              v-model="form.ingredientGroups.other"
              class="min-h-24 w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              placeholder="自由记录，例如：冰块、柠檬片、薄荷叶，或补充具体用量。"
            />
          </label>
        </div>

        <p v-if="formError" class="mt-3 rounded-md bg-wine/20 px-3 py-2 text-sm text-cream">
          {{ formError }}
        </p>

        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="space-y-2 text-sm text-muted">
            <span>自我评价</span>
            <select
              v-model.number="form.rating"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
            >
              <option :value="0">未评分</option>
              <option v-for="score in [5, 4, 3, 2, 1]" :key="score" :value="score">
                {{ score }} 星
              </option>
            </select>
          </label>

          <label class="space-y-2 text-sm text-muted">
            <span>口感关键词</span>
            <input
              v-model.trim="form.mood"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              placeholder="清爽 / 酸甜 / 酒感强"
            />
          </label>
        </div>

        <label class="mt-4 block space-y-2 text-sm text-muted">
          <span>复盘</span>
          <textarea
            v-model="form.selfReview"
            class="min-h-24 w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
            placeholder="这杯哪里好喝，下次要调整什么。"
          />
        </label>

        <label class="mt-4 block space-y-2 text-sm text-muted">
          <span>备注</span>
          <textarea
            v-model="form.notes"
            class="min-h-20 w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
            placeholder="场景、朋友反馈、杯型或装饰。"
          />
        </label>

        <div class="mt-5 grid gap-4 sm:grid-cols-[10rem_1fr]">
          <div
            class="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-gold/15 bg-obsidian/70"
          >
            <img
              v-if="form.photoDataUrl"
              :src="form.photoDataUrl"
              alt="作品照片"
              class="h-full w-full object-cover"
            />
            <Camera v-else class="h-8 w-8 text-gold/70" />
          </div>
          <div class="flex flex-col justify-between gap-3">
            <label
              class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10"
            >
              <Camera class="h-4 w-4" />
              {{ isPreparingPhoto ? '正在处理照片' : '选择照片' }}
              <input
                data-testid="work-photo-input"
                class="sr-only"
                type="file"
                accept="image/*"
                :disabled="isPreparingPhoto"
                @change="readPhoto"
              />
            </label>
            <button
              v-if="form.photoDataUrl"
              class="rounded-md border border-wine/70 px-4 py-3 text-sm text-cream"
              type="button"
              @click="removeSelectedPhoto"
            >
              移除照片
            </button>
            <p class="text-xs leading-5 text-muted">
              会保存手机原图，并生成一张 1280px 预览图；单张原图最大 50 MB。
            </p>
          </div>
        </div>

        <button
          data-testid="work-save-button"
          class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold px-5 py-3 font-semibold text-obsidian transition hover:bg-cream"
          type="button"
          @click="submit"
        >
          <Save v-if="editingWorkId" class="h-4 w-4" />
          <Plus v-else class="h-4 w-4" />
          {{ editingWorkId ? '保存修改' : '保存作品' }}
        </button>
      </form>

      <div class="space-y-5">
        <div class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-muted">作品分享</p>
              <p class="mt-1 text-sm leading-6 text-cream/80">
                用 JSON 备份或发给朋友，也可以登录账号后同步到 CloudBase 云端。
              </p>
            </div>
          </div>
          <div class="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
            <label class="space-y-2 text-sm text-muted">
              <span>云端账号</span>
              <input
                v-model.trim="cloudAccountName"
                data-testid="cloud-account-name"
                class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
                placeholder="例如 baibai"
              />
            </label>
            <label class="space-y-2 text-sm text-muted">
              <span>云端密码</span>
              <input
                v-model="cloudPassword"
                data-testid="cloud-account-password"
                class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
                placeholder="输入账号密码"
                type="password"
                @keydown.enter.prevent="loginCloudAccount"
              />
            </label>
            <button
              data-testid="cloud-account-login"
              class="mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-3 text-sm font-semibold text-obsidian transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              :disabled="isSyncingCloud"
              @click="loginCloudAccount"
            >
              <Upload class="h-4 w-4" />
              {{ works.cloudAccount.accountName ? '切换账号' : '登录/创建' }}
            </button>
            <button
              class="mt-auto inline-flex items-center justify-center gap-2 rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              :disabled="!works.cloudAccount.accountName || isSyncingCloud"
              @click="logoutCloudAccount"
            >
              退出
            </button>
          </div>
          <p class="mt-3 rounded-md bg-obsidian/45 px-3 py-2 text-sm text-cream">
            {{
              works.cloudAccount.accountName
                ? `当前云端账号：${works.cloudAccount.accountName}`
                : '还未登录云端账号。账号不存在时会自动创建。'
            }}
          </p>
          <div
            v-if="works.photoRestore.status !== 'idle'"
            data-testid="work-photo-restore-panel"
            class="mt-4 rounded-lg border border-gold/15 bg-obsidian/35 px-4 py-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-cream">照片预览恢复</p>
                <p class="mt-1 text-sm text-muted">{{ works.photoRestore.message }}</p>
              </div>
              <div class="flex gap-2">
                <button
                  v-if="works.photoRestore.status === 'restoring'"
                  data-testid="work-photo-restore-pause"
                  class="rounded-md border border-gold/30 px-3 py-2 text-sm text-gold"
                  type="button"
                  @click="works.pausePhotoRestore"
                >
                  暂停
                </button>
                <button
                  v-if="
                    works.photoRestore.status === 'paused' || works.photoRestore.status === 'error'
                  "
                  data-testid="work-photo-restore-retry"
                  class="rounded-md border border-gold/30 px-3 py-2 text-sm text-gold"
                  type="button"
                  @click="retryPhotoRestore"
                >
                  继续/重试
                </button>
              </div>
            </div>
            <div class="mt-3 h-2 overflow-hidden rounded-full bg-cream/10">
              <div
                class="h-full rounded-full bg-gold transition-all"
                :style="{ width: photoRestorePercent }"
              />
            </div>
            <p class="mt-2 text-xs text-muted">
              {{ works.photoRestore.completed }}/{{ works.photoRestore.total }}
            </p>
          </div>
          <div
            class="mt-4 rounded-lg border border-gold/15 bg-obsidian/35 px-4 py-3"
            data-testid="auto-cloud-backup-panel"
          >
            <label class="flex cursor-pointer items-start justify-between gap-4">
              <span>
                <span class="block text-sm font-semibold text-cream">自动备份</span>
                <span class="mt-1 block text-sm leading-6 text-muted">
                  打开作品页时检查上次云端备份，超过 1 天会先询问再轻量同步账号数据。
                </span>
              </span>
              <input
                data-testid="auto-cloud-backup-toggle"
                class="mt-1 h-5 w-5 accent-gold"
                type="checkbox"
                :checked="works.autoBackup.enabled"
                @change="toggleAutoBackup"
              />
            </label>
            <p class="mt-3 rounded-md bg-obsidian/45 px-3 py-2 text-sm text-cream">
              {{ autoBackupStatusText }}
            </p>
          </div>
          <div
            ref="drinkRequestPanelEl"
            class="mt-4 rounded-lg border border-gold/15 bg-obsidian/35 px-4 py-4"
          >
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p class="text-sm font-semibold text-cream">朋友想喝</p>
                <p class="mt-1 text-sm leading-6 text-muted">
                  生成分享链接后，朋友可以提交一条无照片点单。你可以随时关闭或重置链接。
                </p>
              </div>
              <div class="flex flex-wrap gap-3">
                <button
                  data-testid="drink-share-reset"
                  class="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-3 text-sm font-semibold text-obsidian transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  :disabled="!works.cloudAccount.accountName || isDrinkRequestSyncing"
                  @click="resetDrinkShareLink"
                >
                  <Upload class="h-4 w-4" />
                  {{ drinkShare.enabled ? '重置分享链接' : '生成分享链接' }}
                </button>
                <button
                  data-testid="drink-share-disable"
                  class="inline-flex items-center justify-center rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  :disabled="!drinkShare.enabled || isDrinkRequestSyncing"
                  @click="disableDrinkShareLink"
                >
                  关闭链接
                </button>
                <button
                  data-testid="drink-request-refresh"
                  class="inline-flex items-center justify-center rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  :disabled="!works.cloudAccount.accountName || isDrinkRequestSyncing"
                  @click="() => loadDrinkRequestPanel()"
                >
                  刷新点单
                </button>
              </div>
            </div>
            <p
              v-if="drinkShare.url"
              class="mt-3 break-all rounded-md bg-obsidian/45 px-3 py-2 text-sm text-cream"
            >
              {{ drinkShare.url }}
            </p>
            <p v-else class="mt-3 rounded-md bg-obsidian/45 px-3 py-2 text-sm text-cream">
              {{
                works.cloudAccount.accountName
                  ? '当前没有可用分享链接。'
                  : '请先登录云端账号，再生成朋友点单链接。'
              }}
            </p>
            <p
              v-if="drinkRequestMessage"
              class="mt-3 rounded-md bg-obsidian/45 px-3 py-2 text-sm text-cream"
            >
              {{ drinkRequestMessage }}
            </p>
            <button
              data-testid="drink-request-summary"
              class="mt-4 flex w-full items-center justify-between gap-4 rounded-lg border border-gold/15 bg-obsidian/35 px-4 py-3 text-left transition hover:border-gold/30"
              type="button"
              :aria-expanded="isDrinkRequestListExpanded"
              @click="isDrinkRequestListExpanded = !isDrinkRequestListExpanded"
            >
              <span class="text-sm font-semibold text-cream">
                当前有 {{ drinkRequests.length }} 条朋友点单
              </span>
              <ChevronUp v-if="isDrinkRequestListExpanded" class="h-5 w-5 shrink-0 text-gold" />
              <ChevronDown v-else class="h-5 w-5 shrink-0 text-gold" />
            </button>
            <div
              v-if="isDrinkRequestListExpanded && drinkRequests.length"
              data-testid="drink-request-list"
              class="mt-4 space-y-3"
            >
              <article
                v-for="request in drinkRequests"
                :key="request.id"
                class="rounded-lg border border-gold/10 bg-walnut/60 p-4"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p class="text-xs uppercase tracking-[0.18em] text-gold">
                      {{ formatDrinkRequestDate(request.createdAt) }}
                    </p>
                    <h3 class="mt-1 font-display text-2xl text-cream">
                      {{ request.cocktailName }}
                    </h3>
                  </div>
                  <div class="flex items-center gap-2">
                    <p v-if="request.guestName" class="text-sm text-muted">
                      {{ request.guestName }}
                    </p>
                    <button
                      data-testid="drink-request-delete"
                      class="rounded-md border border-wine/70 p-2 text-cream transition hover:bg-wine/20 disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      :aria-label="`删除点单 ${request.cocktailName}`"
                      :disabled="isDrinkRequestSyncing"
                      @click="deleteDrinkRequestItem(request)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p class="mt-3 whitespace-pre-line text-sm leading-6 text-muted">
                  {{ formatDrinkRequestIngredients(request.ingredientGroups) }}
                </p>
                <p v-if="request.note" class="mt-2 text-sm leading-6 text-cream/85">
                  {{ request.note }}
                </p>
              </article>
            </div>
            <p
              v-else-if="isDrinkRequestListExpanded"
              class="mt-4 rounded-md bg-obsidian/45 px-3 py-2 text-sm text-muted"
            >
              当前还没有朋友点单。
            </p>
          </div>
          <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="text-sm leading-6 text-muted">
              账号数据保存在 CloudBase，作品原图与预览图保存在私有
              OSS。新电脑首次登录会自动恢复全部预览图，原图按需下载。
            </div>
            <div class="flex flex-wrap gap-3">
              <button
                class="inline-flex items-center justify-center gap-2 rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                :disabled="!works.cloudAccount.accountName || isSyncingCloud"
                @click="pushWorksToCloud"
              >
                <Upload class="h-4 w-4" />
                {{ isSyncingCloud ? '同步中' : '上传到云端' }}
              </button>
              <button
                class="inline-flex items-center justify-center gap-2 rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                :disabled="!works.cloudAccount.accountName || isSyncingCloud"
                @click="loadWorksFromCloud"
              >
                <Download class="h-4 w-4" />
                从云端恢复
              </button>
              <button
                class="inline-flex items-center justify-center gap-2 rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                :disabled="!works.totalCount"
                @click="exportWorks"
              >
                <Download class="h-4 w-4" />
                导出 JSON
              </button>
              <button
                class="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-3 text-sm font-semibold text-obsidian transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                :disabled="!filteredWorks.length || isExportingLongImage"
                @click="exportLongImages"
              >
                <Download class="h-4 w-4" />
                {{ isExportingLongImage ? '生成中' : '导出长图' }}
              </button>
              <label
                class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-gold px-4 py-3 text-sm font-semibold text-obsidian transition hover:bg-cream"
              >
                <Upload class="h-4 w-4" />
                导入 JSON
                <input
                  class="sr-only"
                  type="file"
                  accept="application/json,.json"
                  @change="importWorks"
                />
              </label>
            </div>
          </div>
          <p
            v-if="shareMessage"
            class="mt-3 rounded-md bg-obsidian/45 px-3 py-2 text-sm text-cream"
          >
            {{ shareMessage }}
          </p>
          <div class="mt-4 rounded-lg border px-4 py-3" :class="cloudSyncStatusClass" role="status">
            <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.2em] text-gold">CloudBase</p>
                <p class="mt-1 text-sm font-semibold text-cream">{{ cloudSyncStatusLabel }}</p>
              </div>
              <p v-if="cloudSyncTimeText" class="text-xs text-muted">
                {{ cloudSyncTimeText }}
              </p>
            </div>
            <p class="mt-2 text-sm leading-6 text-cream/85">{{ works.cloudSync.message }}</p>
          </div>
        </div>

        <div class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-sm text-muted">作品筛选</p>
              <p class="mt-1 text-sm leading-6 text-cream/80">
                导出长图会使用当前筛选结果，每张图最多 10 条作品。
              </p>
            </div>
            <button
              class="inline-flex items-center justify-center rounded-md border border-gold/30 px-3 py-2 text-sm text-gold transition hover:bg-gold/10"
              type="button"
              @click="resetWorkFilters"
            >
              清空筛选
            </button>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label class="space-y-2 text-sm text-muted">
              <span>开始日期</span>
              <span class="relative block">
                <input
                  v-model="workFilters.startDate"
                  data-testid="work-filter-start-date"
                  class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-transparent [color-scheme:dark] outline-none focus:ring-2 focus:ring-gold"
                  type="date"
                />
                <span
                  data-testid="work-filter-start-placeholder"
                  class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cream"
                >
                  {{ workFilters.startDate || '请选择开始日期' }}
                </span>
              </span>
            </label>
            <label class="space-y-2 text-sm text-muted">
              <span>结束日期</span>
              <span class="relative block">
                <input
                  v-model="workFilters.endDate"
                  data-testid="work-filter-end-date"
                  class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-transparent [color-scheme:dark] outline-none focus:ring-2 focus:ring-gold"
                  type="date"
                />
                <span
                  data-testid="work-filter-end-placeholder"
                  class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cream"
                >
                  {{ workFilters.endDate || '请选择结束日期' }}
                </span>
              </span>
            </label>
            <label class="space-y-2 text-sm text-muted">
              <span>包含基酒</span>
              <select
                v-model="workFilters.baseLiquor"
                data-testid="work-filter-base"
                class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              >
                <option value="">全部基酒</option>
                <option v-for="option in baseLiquorOptions" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </label>
            <label class="space-y-2 text-sm text-muted">
              <span>评分</span>
              <select
                v-model.number="workFilters.minRating"
                data-testid="work-filter-rating"
                class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              >
                <option :value="0">全部评分</option>
                <option v-for="score in [5, 4, 3, 2, 1]" :key="score" :value="score">
                  至少 {{ score }} 星
                </option>
              </select>
            </label>
          </div>
          <p class="mt-3 rounded-md bg-obsidian/45 px-3 py-2 text-sm text-cream">
            当前显示 {{ filteredWorks.length }} 条 / 共 {{ works.totalCount }} 条
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
            <p class="text-sm text-muted">作品数</p>
            <p class="mt-2 font-display text-3xl">{{ works.totalCount }}</p>
          </div>
          <div class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
            <p class="text-sm text-muted">平均评分</p>
            <p class="mt-2 font-display text-3xl">{{ averageRatingText }}</p>
          </div>
          <div class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
            <p class="text-sm text-muted">最近一次</p>
            <p class="mt-2 font-display text-3xl">{{ latestDateText }}</p>
          </div>
        </div>

        <button
          v-if="works.totalCount"
          data-testid="work-list-summary"
          class="w-full rounded-lg border border-gold/15 bg-walnut/70 p-5 text-left transition hover:border-gold/35 hover:bg-walnut"
          type="button"
          :aria-expanded="isWorkListExpanded"
          @click="toggleWorkListExpanded"
        >
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm text-muted">作品列表</p>
              <p class="mt-2 font-display text-3xl text-cream">
                当前有 {{ filteredWorks.length }} 个酒
              </p>
            </div>
            <ChevronUp v-if="isWorkListExpanded" class="h-5 w-5 shrink-0 text-gold" />
            <ChevronDown v-else class="h-5 w-5 shrink-0 text-gold" />
          </div>
        </button>

        <div v-if="isWorkListExpanded && filteredWorks.length" class="space-y-4">
          <article
            v-for="item in filteredWorks"
            :key="item.id"
            class="grid gap-4 rounded-lg border border-gold/15 bg-walnut/70 p-4 sm:grid-cols-[7rem_1fr]"
          >
            <div
              class="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-obsidian/70"
            >
              <img
                v-if="item.photoDataUrl"
                :src="item.photoDataUrl"
                :alt="item.cocktailName"
                class="h-full w-full object-cover"
              />
              <Sparkles v-else class="h-7 w-7 text-gold/70" />
            </div>
            <div class="min-w-0">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.18em] text-gold">{{ item.madeAt }}</p>
                  <h2 class="mt-1 font-display text-2xl text-cream">{{ item.cocktailName }}</h2>
                </div>
                <div class="flex shrink-0 gap-2">
                  <button
                    v-if="item.photoBackupMode === 'original-and-preview'"
                    data-testid="work-original-download"
                    class="rounded-md border border-gold/30 p-2 text-gold transition hover:bg-gold/10"
                    type="button"
                    :aria-label="`下载原图 ${item.cocktailName}`"
                    @click="downloadOriginalPhoto(item)"
                  >
                    <Download class="h-4 w-4" />
                  </button>
                  <button
                    class="rounded-md border border-gold/30 p-2 text-gold transition hover:bg-gold/10"
                    type="button"
                    :aria-label="`编辑 ${item.cocktailName}`"
                    @click="editWork(item)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    class="rounded-md border border-wine/70 p-2 text-cream transition hover:bg-wine/20"
                    type="button"
                    :aria-label="`删除 ${item.cocktailName}`"
                    @click="works.remove(item.id)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div class="mt-3 flex flex-wrap gap-2 text-xs">
                <span v-if="item.rating" class="rounded-md bg-gold px-2 py-1 text-obsidian">
                  {{ item.rating }} 星
                </span>
                <span v-if="item.mood" class="rounded-md bg-cream/10 px-2 py-1 text-cream">
                  {{ item.mood }}
                </span>
              </div>

              <button
                data-testid="work-expand-toggle"
                class="mt-3 inline-flex items-center gap-2 rounded-md border border-gold/25 px-3 py-2 text-xs text-gold transition hover:bg-gold/10"
                type="button"
                :aria-expanded="isWorkExpanded(item.id)"
                @click="toggleWorkExpanded(item.id)"
              >
                <ChevronUp v-if="isWorkExpanded(item.id)" class="h-3.5 w-3.5" />
                <ChevronDown v-else class="h-3.5 w-3.5" />
                {{ isWorkExpanded(item.id) ? '收起详情' : '展开详情' }}
              </button>

              <div v-if="isWorkExpanded(item.id)" class="mt-3 border-t border-gold/10 pt-3">
                <p class="whitespace-pre-line text-sm leading-6 text-muted">
                  {{ formatWorkIngredients(item) }}
                </p>
                <p v-if="item.selfReview" class="mt-3 text-sm leading-6 text-cream">
                  {{ item.selfReview }}
                </p>
                <p v-if="item.notes" class="mt-2 text-xs leading-5 text-muted">
                  {{ item.notes }}
                </p>
              </div>
            </div>
          </article>
        </div>

        <StateBlock
          v-else-if="isWorkListExpanded || !works.totalCount"
          :title="works.totalCount ? '没有匹配作品' : '还没有作品'"
          :message="
            works.totalCount
              ? '调整筛选条件后再导出长图。'
              : '保存第一杯，今晚的味道就不会只留在记忆里。'
          "
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Download,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-vue-next'

import SectionHeading from '@/components/common/SectionHeading.vue'
import StateBlock from '@/components/common/StateBlock.vue'
import { allIngredients, cocktails } from '@/data/cocktails'
import {
  exportWorkRecords,
  formatWorkIngredients,
  useWorkStore,
  type WorkIngredientGroups,
  type WorkRecord,
  type WorkRecordInput,
} from '@/stores/works'
import {
  deleteDrinkRequest,
  disableDrinkRequestShare,
  fetchDrinkRequests,
  getDrinkRequestShare,
  resetDrinkRequestShare,
  type DrinkRequest,
  type DrinkRequestShareState,
} from '@/services/cloudDrinkRequests'
import { getCloudWorksSession } from '@/services/cloudWorks'
import {
  downloadWorkOriginal,
  prepareWorkPhoto,
  type PreparedWorkPhoto,
} from '@/services/workPhotos'
import {
  CUSTOM_OPTION_VALUE,
  addCustomMaterialOption,
  addCustomWorkCocktailOption,
  getBeverageSelectOptions,
  getCocktailSelectOptions,
  getCustomMaterialOptions,
  getCustomWorkCocktailOptions,
  getFlavorLiquorSelectOptions,
  isFlavorLiquorOption,
} from '@/utils/workFormOptions'
import {
  exportWorkLongImages,
  filterWorkRecords,
  hasActiveWorkFilters,
  type WorkFilterState,
} from '@/utils/workShare'

const works = useWorkStore()
const selectedSlug = ref('')
const selectedFlavorLiquor = ref('')
const selectedBeverage = ref('')
const cocktailSearch = ref('')
const flavorLiquorSearch = ref('')
const beverageSearch = ref('')
const customFlavorLiquorName = ref('')
const customBeverageName = ref('')
const customFlavorLiquors = ref(getCustomMaterialOptions('flavorLiquors'))
const customBeverages = ref(getCustomMaterialOptions('beverages'))
const customCocktails = ref(getCustomWorkCocktailOptions())
const isAddingFlavorLiquor = ref(false)
const isAddingBeverage = ref(false)
const formError = ref('')
const shareMessage = ref('')
const cloudAccountName = ref(works.cloudAccount.accountName)
const cloudPassword = ref('')
const editingWorkId = ref<string | null>(null)
const isExportingLongImage = ref(false)
const isSyncingCloud = ref(false)
const isPreparingPhoto = ref(false)
const pendingPhoto = ref<PreparedWorkPhoto | null>(null)
const isPhotoRemoved = ref(false)
const autoBackupPrompt = ref(false)
const isDrinkRequestSyncing = ref(false)
const drinkRequestMessage = ref('')
const drinkRequests = ref<DrinkRequest[]>([])
const newDrinkRequestPrompt = ref<{ count: number } | null>(null)
const isDrinkRequestListExpanded = ref(false)
const expandedWorkIds = ref<string[]>([])
const isWorkListExpanded = ref(false)
const drinkShare = ref<DrinkRequestShareState>({
  enabled: false,
  token: '',
  url: '',
  requestCount: 0,
  updatedAt: '',
})
const dateInput = ref<HTMLInputElement | null>(null)
const workFormEl = ref<HTMLFormElement | null>(null)
const drinkRequestPanelEl = ref<HTMLElement | null>(null)
const saveDialog = ref<{ kind: 'success' | 'error'; title: string; message: string } | null>(null)
const saveDialogTitleId = 'work-save-dialog-title'
const getToday = () => new Date().toISOString().slice(0, 10)
const createIngredientGroups = (): WorkIngredientGroups => ({
  baseLiquors: ['', '', '', ''],
  flavorLiquors: [],
  beverages: [],
  other: '',
})

type WorkForm = WorkRecordInput & {
  ingredientGroups: WorkIngredientGroups
}

const form = reactive<WorkForm>({
  madeAt: getToday(),
  cocktailSlug: '',
  cocktailName: '',
  photoDataUrl: '',
  ingredientsText: '',
  ingredientGroups: createIngredientGroups(),
  rating: 0,
  mood: '',
  selfReview: '',
  notes: '',
})
const photoRestorePercent = computed(() => {
  if (!works.photoRestore.total) return '0%'
  return `${Math.min(100, Math.round((works.photoRestore.completed / works.photoRestore.total) * 100))}%`
})
const workFilters = reactive<WorkFilterState>({
  startDate: '',
  endDate: '',
  baseLiquor: '',
  minRating: 0,
})

const baseLiquorOptions = ['金酒', '朗姆酒', '伏特加', '龙舌兰', '威士忌', '白兰地']
const priorityBeverages = ['柠檬水溶C', '葡萄味气泡水', '橙汁', '东方树叶', '西柚汁']
const drinkRequestSeenCountPrefix = 'twilight_drink_request_seen_count'
const extraBeverages = [
  '水溶C',
  '葡萄气泡水',
  '白葡萄汁',
  '白桃气泡水',
  '雪碧',
  '苏打水',
  '汤力水',
  '可乐',
  '绿茶',
  '红茶',
  '乌龙茶',
  '养乐多',
  '菠萝汁',
  '蔓越莓汁',
  '苹果汁',
  '葡萄汁',
  '柠檬汁',
  '青柠汁',
  '姜汁汽水',
  '姜汁啤酒',
  '咖啡',
  '牛奶',
  '椰奶',
]

const getBaseLiquorLabel = (name: string) => {
  if (/金酒|琴酒|Gin/i.test(name)) return '金酒'
  if (/朗姆|Rum/i.test(name)) return '朗姆酒'
  if (/伏特加|Vodka/i.test(name)) return '伏特加'
  if (/龙舌兰|Tequila/i.test(name)) return '龙舌兰'
  if (/威士忌|威士忌|Whisk|Bourbon|Scotch|Rye/i.test(name)) return '威士忌'
  if (/白兰地|Brandy|Cognac/i.test(name)) return '白兰地'
  return ''
}

const beveragePriorityOptions = computed(() => [...priorityBeverages, ...extraBeverages])
const allBeverageNames = computed(() =>
  getBeverageSelectOptions(
    allIngredients,
    beveragePriorityOptions.value,
    '',
    customBeverages.value,
  ).filter((item) => item !== CUSTOM_OPTION_VALUE),
)
const isBeverageName = (name: string) => allBeverageNames.value.includes(name)

const cocktailOptions = computed(() =>
  getCocktailSelectOptions(cocktails, cocktailSearch.value, customCocktails.value),
)
const beverageOptions = computed(() =>
  getBeverageSelectOptions(
    allIngredients,
    beveragePriorityOptions.value,
    beverageSearch.value,
    customBeverages.value,
  ),
)
const flavorLiquorOptions = computed(() =>
  getFlavorLiquorSelectOptions(allIngredients, flavorLiquorSearch.value, customFlavorLiquors.value),
)
const selectedBaseLiquorCount = computed(
  () => form.ingredientGroups.baseLiquors.filter(Boolean).length,
)
const filteredWorks = computed(() => filterWorkRecords(works.latestItems, workFilters))
const averageRatingText = computed(() => (works.averageRating ? `${works.averageRating}` : '-'))
const latestDateText = computed(() => works.latestItems[0]?.madeAt.slice(5) ?? '-')
const cloudSyncStatusLabel = computed(() => {
  if (works.cloudSync.status === 'syncing') return '同步中'
  if (works.cloudSync.status === 'success') return '同步成功'
  if (works.cloudSync.status === 'error') return '同步失败'
  return '云端状态'
})
const cloudSyncStatusClass = computed(() => {
  if (works.cloudSync.status === 'syncing') return 'border-gold/35 bg-gold/10'
  if (works.cloudSync.status === 'success') return 'border-cream/20 bg-cream/10'
  if (works.cloudSync.status === 'error') return 'border-wine/60 bg-wine/20'
  return 'border-gold/15 bg-obsidian/45'
})
const cloudSyncTimeText = computed(() => {
  if (!works.cloudSync.updatedAt) return ''
  return `最后更新 ${new Date(works.cloudSync.updatedAt).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })}`
})
const autoBackupLastBackupText = computed(() => {
  if (!works.autoBackup.lastBackupAt) return '还没有云端备份记录。'
  return `上次备份 ${new Date(works.autoBackup.lastBackupAt).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })}`
})
const autoBackupStatusText = computed(() =>
  works.autoBackup.enabled
    ? `自动备份已开启，${autoBackupLastBackupText.value}`
    : '自动备份已关闭，仍可手动上传到云端。',
)
const formatDrinkRequestIngredients = (groups: WorkIngredientGroups) =>
  [
    groups.baseLiquors.length ? `基酒：${groups.baseLiquors.join('、')}` : '',
    groups.flavorLiquors.length ? `调味酒：${groups.flavorLiquors.join('、')}` : '',
    groups.beverages.length ? `饮料：${groups.beverages.join('、')}` : '',
    groups.other,
  ]
    .filter(Boolean)
    .join('\n') || '未填写材料'

const formatDrinkRequestDate = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

const drinkRequestSeenCountStorageKey = () => {
  const session = getCloudWorksSession()
  return session ? `${drinkRequestSeenCountPrefix}:${session.accountNameKey}` : ''
}

const readDrinkRequestSeenCount = () => {
  const key = drinkRequestSeenCountStorageKey()
  if (!key) return 0
  return Number(window.localStorage.getItem(key) || 0) || 0
}

const writeDrinkRequestSeenCount = (count: number) => {
  const key = drinkRequestSeenCountStorageKey()
  if (!key) return
  window.localStorage.setItem(key, `${Math.max(0, count)}`)
}

const isWorkExpanded = (id: string) => expandedWorkIds.value.includes(id)

const toggleWorkExpanded = (id: string) => {
  expandedWorkIds.value = isWorkExpanded(id)
    ? expandedWorkIds.value.filter((item) => item !== id)
    : [...expandedWorkIds.value, id]
}

const toggleWorkListExpanded = () => {
  isWorkListExpanded.value = !isWorkListExpanded.value
}

const openDatePicker = () => {
  const input = dateInput.value as (HTMLInputElement & { showPicker?: () => void }) | null
  input?.showPicker?.()
}

const isBaseOptionDisabled = (option: string, index: number) =>
  form.ingredientGroups.baseLiquors.some(
    (item, itemIndex) => item === option && itemIndex !== index,
  )

const addUnique = (items: string[], value: string) => {
  const next = value.trim()
  if (next && !items.includes(next)) items.push(next)
}

const removeFrom = (items: string[], value: string) => {
  const index = items.indexOf(value)
  if (index >= 0) items.splice(index, 1)
}

const addFlavorLiquor = () => {
  if (selectedFlavorLiquor.value === CUSTOM_OPTION_VALUE) {
    isAddingFlavorLiquor.value = true
    selectedFlavorLiquor.value = ''
    return
  }
  addUnique(form.ingredientGroups.flavorLiquors, selectedFlavorLiquor.value)
  selectedFlavorLiquor.value = ''
}

const removeFlavorLiquor = (value: string) => {
  removeFrom(form.ingredientGroups.flavorLiquors, value)
}

const addBeverage = () => {
  if (selectedBeverage.value === CUSTOM_OPTION_VALUE) {
    isAddingBeverage.value = true
    selectedBeverage.value = ''
    return
  }
  addUnique(form.ingredientGroups.beverages, selectedBeverage.value)
  selectedBeverage.value = ''
}

const removeBeverage = (value: string) => {
  removeFrom(form.ingredientGroups.beverages, value)
}

const saveCustomFlavorLiquor = () => {
  const name = customFlavorLiquorName.value.trim()
  if (!name) return
  addCustomMaterialOption('flavorLiquors', name)
  customFlavorLiquors.value = getCustomMaterialOptions('flavorLiquors')
  addUnique(form.ingredientGroups.flavorLiquors, name)
  customFlavorLiquorName.value = ''
  isAddingFlavorLiquor.value = false
}

const saveCustomBeverage = () => {
  const name = customBeverageName.value.trim()
  if (!name) return
  addCustomMaterialOption('beverages', name)
  customBeverages.value = getCustomMaterialOptions('beverages')
  addUnique(form.ingredientGroups.beverages, name)
  customBeverageName.value = ''
  isAddingBeverage.value = false
}

const cloneIngredientGroups = (groups: WorkIngredientGroups): WorkIngredientGroups => ({
  baseLiquors: [...groups.baseLiquors],
  flavorLiquors: [...groups.flavorLiquors],
  beverages: [...groups.beverages],
  other: groups.other,
})

const isKnownCocktailName = (name: string) =>
  cocktails.some((item) => item.nameZh === name) ||
  customCocktails.value.some((item) => item.nameZh === name)

const applyCocktail = () => {
  const customCocktail = customCocktails.value.find((item) => item.value === selectedSlug.value)
  if (customCocktail) {
    form.cocktailSlug = customCocktail.value
    form.cocktailName = customCocktail.nameZh
    form.ingredientGroups = customCocktail.ingredientGroups
      ? cloneIngredientGroups(customCocktail.ingredientGroups)
      : createIngredientGroups()
    form.ingredientsText = customCocktail.ingredientsText ?? ''
    return
  }

  const cocktail = cocktails.find((item) => item.slug === selectedSlug.value)
  form.cocktailSlug = cocktail?.slug ?? ''
  if (!cocktail) return
  form.cocktailName = cocktail.nameZh
  const groups = createIngredientGroups()
  const otherItems: string[] = []

  cocktail.ingredients.forEach((item) => {
    const baseLiquor = getBaseLiquorLabel(item.nameZh || item.nameEn)
    if (baseLiquor && !groups.baseLiquors.includes(baseLiquor)) {
      const slot = groups.baseLiquors.findIndex((value) => !value)
      if (slot >= 0) groups.baseLiquors[slot] = baseLiquor
      return
    }

    if (isBeverageName(item.nameZh)) {
      addUnique(groups.beverages, item.nameZh)
      return
    }

    if (isFlavorLiquorOption({ nameZh: item.nameZh, nameEn: item.nameEn })) {
      addUnique(groups.flavorLiquors, item.nameZh)
      return
    }

    otherItems.push(`${item.nameZh}${item.amount ? ` ${item.amount}` : ''}`)
  })

  groups.other = otherItems.join('\n')
  form.ingredientGroups = groups
  form.ingredientsText = formatWorkIngredients({ ingredientsText: '', ingredientGroups: groups })
}

const readPhoto = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  formError.value = ''
  isPreparingPhoto.value = true
  try {
    pendingPhoto.value = await prepareWorkPhoto(file)
    form.photoDataUrl = pendingPhoto.value.previewDataUrl
    isPhotoRemoved.value = false
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '照片处理失败，请重新选择。'
  } finally {
    isPreparingPhoto.value = false
    input.value = ''
  }
}

const removeSelectedPhoto = () => {
  pendingPhoto.value = null
  form.photoDataUrl = ''
  isPhotoRemoved.value = true
}

const exportWorks = () => {
  shareMessage.value = ''
  if (!works.totalCount) {
    shareMessage.value = '当前还没有可导出的作品。'
    return
  }

  const blob = new Blob([exportWorkRecords(works.items)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `twilight-mixbook-works-${getToday()}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  shareMessage.value = `已导出 ${works.totalCount} 条作品。`
}

const resetWorkFilters = () => {
  Object.assign(workFilters, {
    startDate: '',
    endDate: '',
    baseLiquor: '',
    minRating: 0,
  })
}

const exportLongImages = async () => {
  shareMessage.value = ''
  if (!filteredWorks.value.length) {
    shareMessage.value = '当前没有可导出的作品。'
    return
  }
  if (!hasActiveWorkFilters(workFilters) && !window.confirm('当前导出为全部，确定要导出？')) {
    return
  }

  const includeSelfReview = window.confirm('长图是否包含复盘内容？')
  isExportingLongImage.value = true
  try {
    const pageCount = await exportWorkLongImages(
      filteredWorks.value,
      { includeSelfReview },
      `twilight-mixbook-works-${getToday()}`,
    )
    shareMessage.value = `已导出 ${filteredWorks.value.length} 条作品，共 ${pageCount} 张长图。`
  } catch (error) {
    shareMessage.value = error instanceof Error ? error.message : '生成长图失败，请稍后重试。'
  } finally {
    isExportingLongImage.value = false
  }
}

const loginCloudAccount = async () => {
  shareMessage.value = ''
  isSyncingCloud.value = true
  try {
    const preview = await works.previewCloudAccount(cloudAccountName.value, cloudPassword.value)
    const sourceText =
      preview.status === 'new'
        ? `云端账号「${preview.session.accountName}」尚无数据，确认后会创建新账号。`
        : `云端账号「${preview.session.accountName}」现有 ${preview.recordCount} 个作品。`
    const confirmed = window.confirm(
      `${sourceText}\n\n切换后将以云端账号数据为准，覆盖本机当前账号的作品和照片、酒柜、收藏、课程进度、每日推荐、自定义材料及自动备份设置。是否继续？`,
    )
    if (!confirmed) {
      shareMessage.value = '已取消切换，本地账号数据未改变。'
      return
    }

    await works.activateCloudAccount(preview)
    cloudAccountName.value = works.cloudAccount.accountName
    cloudPassword.value = ''
    shareMessage.value = works.cloudSync.message
    await loadDrinkRequestPanel()
  } catch {
    shareMessage.value = works.cloudSync.message
  } finally {
    isSyncingCloud.value = false
  }
}

const logoutCloudAccount = () => {
  works.logoutCloudAccount()
  cloudAccountName.value = ''
  cloudPassword.value = ''
  shareMessage.value = works.cloudSync.message
  drinkShare.value = { enabled: false, token: '', url: '', requestCount: 0, updatedAt: '' }
  drinkRequests.value = []
  newDrinkRequestPrompt.value = null
  drinkRequestMessage.value = ''
}

const pushWorksToCloud = async () => {
  shareMessage.value = ''
  if (!works.cloudAccount.accountName) {
    shareMessage.value = '请先登录云端账号。'
    return
  }

  isSyncingCloud.value = true
  try {
    await works.pushAllToCloud()
    shareMessage.value = works.cloudSync.message
  } catch {
    shareMessage.value = works.cloudSync.message
  } finally {
    isSyncingCloud.value = false
  }
}

const checkAutoBackupPrompt = () => {
  if (isSyncingCloud.value) return
  autoBackupPrompt.value = works.shouldPromptAutoCloudBackup()
}

const toggleAutoBackup = (event: Event) => {
  const enabled = (event.target as HTMLInputElement).checked
  works.setAutoBackupEnabled(enabled)
  shareMessage.value = enabled
    ? '自动备份已开启。打开作品页时超过 1 天会先询问再上传。'
    : '自动备份已关闭。'
  if (enabled) {
    checkAutoBackupPrompt()
    return
  }
  autoBackupPrompt.value = false
}

const dismissAutoBackupPrompt = () => {
  autoBackupPrompt.value = false
  shareMessage.value = '已暂时跳过自动备份。'
}

const confirmAutoBackup = async () => {
  autoBackupPrompt.value = false
  await pushWorksToCloud()
}

const dismissDrinkRequestPrompt = () => {
  newDrinkRequestPrompt.value = null
}

const viewNewDrinkRequests = () => {
  newDrinkRequestPrompt.value = null
  isDrinkRequestListExpanded.value = true
  drinkRequestPanelEl.value?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

const loadDrinkRequestPanel = async (options: { notifyNew?: boolean } = { notifyNew: true }) => {
  drinkRequestMessage.value = ''
  if (!works.cloudAccount.accountName) return

  isDrinkRequestSyncing.value = true
  try {
    const previousCount = readDrinkRequestSeenCount()
    const [share, requests] = await Promise.all([getDrinkRequestShare(), fetchDrinkRequests()])
    drinkShare.value = share
    drinkRequests.value = requests
    const newCount = Math.max(0, requests.length - previousCount)
    if (options.notifyNew !== false && newCount > 0) {
      newDrinkRequestPrompt.value = { count: newCount }
    }
    writeDrinkRequestSeenCount(requests.length)
    drinkRequestMessage.value = requests.length
      ? `已加载 ${requests.length} 条朋友点单。`
      : '当前还没有朋友点单。'
  } catch (error) {
    drinkRequestMessage.value =
      error instanceof Error ? error.message : '读取朋友点单失败，请稍后重试。'
  } finally {
    isDrinkRequestSyncing.value = false
  }
}

const resetDrinkShareLink = async () => {
  drinkRequestMessage.value = ''
  isDrinkRequestSyncing.value = true
  try {
    drinkShare.value = await resetDrinkRequestShare()
    drinkRequests.value = await fetchDrinkRequests()
    writeDrinkRequestSeenCount(drinkRequests.value.length)
    drinkRequestMessage.value = '分享链接已生成。旧链接会失效。'
  } catch (error) {
    drinkRequestMessage.value =
      error instanceof Error ? error.message : '生成分享链接失败，请稍后重试。'
  } finally {
    isDrinkRequestSyncing.value = false
  }
}

const disableDrinkShareLink = async () => {
  drinkRequestMessage.value = ''
  if (
    !window.confirm(
      `关闭后当前链接立即失效，并永久删除该链接下全部 ${drinkRequests.value.length} 条点单，是否继续？`,
    )
  ) {
    return
  }
  isDrinkRequestSyncing.value = true
  try {
    await disableDrinkRequestShare()
    drinkShare.value = { enabled: false, token: '', url: '', requestCount: 0, updatedAt: '' }
    drinkRequests.value = []
    isDrinkRequestListExpanded.value = false
    newDrinkRequestPrompt.value = null
    writeDrinkRequestSeenCount(0)
    drinkRequestMessage.value = '分享链接已关闭。'
  } catch (error) {
    drinkRequestMessage.value =
      error instanceof Error ? error.message : '关闭分享链接失败，请稍后重试。'
  } finally {
    isDrinkRequestSyncing.value = false
  }
}

const deleteDrinkRequestItem = async (request: DrinkRequest) => {
  drinkRequestMessage.value = ''
  isDrinkRequestSyncing.value = true
  try {
    await deleteDrinkRequest(request.id)
    drinkRequests.value = drinkRequests.value.filter((item) => item.id !== request.id)
    drinkShare.value = {
      ...drinkShare.value,
      requestCount: Math.max(0, drinkShare.value.requestCount - 1),
    }
    writeDrinkRequestSeenCount(drinkRequests.value.length)
    drinkRequestMessage.value = `已删除点单「${request.cocktailName}」。`
  } catch (error) {
    drinkRequestMessage.value =
      error instanceof Error ? error.message : '删除点单失败，请稍后重试。'
  } finally {
    isDrinkRequestSyncing.value = false
  }
}

const loadWorksFromCloud = async () => {
  shareMessage.value = ''
  if (!works.cloudAccount.accountName) {
    shareMessage.value = '请先登录云端账号。'
    return
  }
  if (
    works.totalCount &&
    !window.confirm('从云端恢复会用云端账号数据覆盖当前本地数据，确定继续？')
  ) {
    return
  }

  isSyncingCloud.value = true
  try {
    await works.loadFromCloud()
    shareMessage.value = works.cloudSync.message
  } catch {
    shareMessage.value = works.cloudSync.message
  } finally {
    isSyncingCloud.value = false
  }
}

const retryPhotoRestore = async () => {
  try {
    await works.restorePhotoPreviews()
  } catch {
    shareMessage.value = works.photoRestore.message
  }
}

const downloadOriginalPhoto = async (item: WorkRecord) => {
  try {
    const blob = await downloadWorkOriginal(item.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = item.photoOriginalName || `${item.cocktailName}-原图`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    shareMessage.value = error instanceof Error ? error.message : '原图下载失败，请稍后重试。'
  }
}

const importWorks = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.addEventListener('load', () => {
    const content = typeof reader.result === 'string' ? reader.result : ''
    const result = works.importFromJson(content)
    shareMessage.value =
      result.importedCount > 0
        ? `已导入 ${result.importedCount} 条作品，跳过 ${result.skippedCount} 条重复或无效记录。`
        : '没有导入新作品，请确认 JSON 文件来自暮调作品导出。'
  })
  reader.addEventListener('error', () => {
    shareMessage.value = '读取 JSON 文件失败，请重新选择文件。'
  })
  reader.readAsText(file)
  input.value = ''
}

const resetForm = () => {
  editingWorkId.value = null
  selectedSlug.value = ''
  selectedFlavorLiquor.value = ''
  selectedBeverage.value = ''
  cocktailSearch.value = ''
  flavorLiquorSearch.value = ''
  beverageSearch.value = ''
  customFlavorLiquorName.value = ''
  customBeverageName.value = ''
  isAddingFlavorLiquor.value = false
  isAddingBeverage.value = false
  formError.value = ''
  pendingPhoto.value = null
  isPhotoRemoved.value = false
  Object.assign(form, {
    madeAt: getToday(),
    cocktailSlug: '',
    cocktailName: '',
    photoDataUrl: '',
    ingredientsText: '',
    ingredientGroups: createIngredientGroups(),
    rating: 0,
    mood: '',
    selfReview: '',
    notes: '',
  })
}

const editWork = (item: WorkRecord) => {
  editingWorkId.value = item.id
  selectedSlug.value = item.cocktailSlug
  selectedFlavorLiquor.value = ''
  selectedBeverage.value = ''
  cocktailSearch.value = ''
  flavorLiquorSearch.value = ''
  beverageSearch.value = ''
  customFlavorLiquorName.value = ''
  customBeverageName.value = ''
  isAddingFlavorLiquor.value = false
  isAddingBeverage.value = false
  formError.value = ''
  pendingPhoto.value = null
  isPhotoRemoved.value = false
  Object.assign(form, {
    madeAt: item.madeAt,
    cocktailSlug: item.cocktailSlug,
    cocktailName: item.cocktailName,
    photoDataUrl: item.photoDataUrl,
    ingredientsText: item.ingredientsText,
    ingredientGroups: item.ingredientGroups
      ? cloneIngredientGroups(item.ingredientGroups)
      : createIngredientGroups(),
    rating: item.rating,
    mood: item.mood,
    selfReview: item.selfReview,
    notes: item.notes,
  })
  workFormEl.value?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

const cancelEdit = () => {
  resetForm()
}

const showSaveDialog = (kind: 'success' | 'error', message: string) => {
  saveDialog.value = {
    kind,
    title: kind === 'success' ? '保存成功' : '保存失败',
    message,
  }
}

const closeSaveDialog = () => {
  saveDialog.value = null
}

const getSaveErrorMessage = (error: unknown) => {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return '浏览器本地存储空间不足，作品没有保存成功。请先导出备份，删除一些旧作品或减少照片大小后再试。'
  }
  if (error instanceof Error && /quota|storage/i.test(error.message)) {
    return '浏览器本地存储空间不足，作品没有保存成功。请先导出备份，删除一些旧作品或减少照片大小后再试。'
  }
  return '保存时出现异常，作品没有写入本地数据。请稍后重试。'
}

const submit = async () => {
  formError.value = ''
  closeSaveDialog()
  if (!form.cocktailName.trim()) {
    formError.value = '请先填写作品名称。'
    showSaveDialog('error', formError.value)
    return
  }
  if (!form.madeAt) {
    formError.value = '请选择调酒日期。'
    showSaveDialog('error', formError.value)
    return
  }
  const ingredientsText = formatWorkIngredients({
    ingredientsText: form.ingredientsText,
    ingredientGroups: form.ingredientGroups,
  })
  const cocktailName = form.cocktailName.trim()
  const ingredientGroups = cloneIngredientGroups(form.ingredientGroups)
  const wasEditing = Boolean(editingWorkId.value)

  const payload: WorkRecordInput = {
    ...form,
    photoDataUrl: pendingPhoto.value ? '' : form.photoDataUrl,
    cocktailName,
    ingredientsText,
    mood: form.mood.trim(),
    selfReview: form.selfReview.trim(),
    notes: form.notes.trim(),
  }

  let savedRecord: WorkRecord | undefined
  try {
    if (editingWorkId.value) {
      const updated = works.update(editingWorkId.value, payload)
      if (!updated) {
        formError.value = '没有找到要编辑的作品，请刷新后重试。'
        showSaveDialog('error', formError.value)
        return
      }
      savedRecord = updated
    } else {
      savedRecord = works.add(payload)
    }
  } catch (error) {
    formError.value = getSaveErrorMessage(error)
    showSaveDialog('error', formError.value)
    return
  }

  let photoBackupWarning = ''
  try {
    if (savedRecord && isPhotoRemoved.value && !pendingPhoto.value) {
      await works.removeWorkPhoto(savedRecord.id)
    }
    if (savedRecord && pendingPhoto.value) {
      await works.attachPreparedPhoto(savedRecord.id, pendingPhoto.value)
      if (works.cloudAccount.accountName) await works.pushAllToCloud()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '照片云备份失败，请稍后重试。'
    photoBackupWarning = `作品已保存在本机，照片云备份暂未完成：${message}。稍后可点击“上传到云端”重试。`
  }

  if (!isKnownCocktailName(cocktailName)) {
    addCustomWorkCocktailOption({
      nameZh: cocktailName,
      ingredientsText,
      ingredientGroups,
    })
    customCocktails.value = getCustomWorkCocktailOptions()
  }

  resetForm()
  showSaveDialog(
    'success',
    photoBackupWarning || (wasEditing ? '作品修改已保存。' : '作品已保存到我的作品。'),
  )
}

onMounted(() => {
  checkAutoBackupPrompt()
  void loadDrinkRequestPanel()
  if (works.cloudAccount.accountName && works.items.some((item) => item.photoPreviewObjectKey)) {
    void works.restorePhotoPreviews()
  }
})
</script>
