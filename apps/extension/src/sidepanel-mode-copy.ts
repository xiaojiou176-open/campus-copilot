import type { ResolvedUiLanguage } from './i18n';

export type ExportFamilyKind =
  | 'current_view'
  | 'resources'
  | 'assignments'
  | 'announcements'
  | 'messages'
  | 'grades'
  | 'deadlines'
  | 'course_panorama'
  | 'administrative_snapshot'
  | 'cluster_merge_review'
  | 'instructor_feedback'
  | 'syllabus'
  | 'groups'
  | 'recordings';

export function getSidepanelModeCopy(locale: ResolvedUiLanguage) {
  if (locale === 'zh-CN') {
    return {
      modeNav: {
        assistant: '助手',
        export: '导出',
        settings: '信任中心',
      },
	    assistant: {
	      title: '你的校园桌面',
	      description: '先看这张工作台里的事实、AI 路线和下一步，再决定要不要提问、导出或打开设置。',
	      currentContext: '当前视图',
	        visibleFacts: '这一屏里有什么',
	        activeConnection: 'AI 路线',
	        openExport: '打开导出',
	        openSettings: '打开信任中心',
	        showWorkspace: '打开完整工作台',
	        hideWorkspace: '收起完整工作台',
	        syncCurrentSite: '同步当前站点',
	        readOnly: '只读',
	      structuredOnly: '仅基于结构化事实',
	      manualOnly: '高风险步骤保持手动',
	      trustSummary: '只根据你已经看见的事实工作。',
	      noConnection: 'AI 连接还没就绪。',
	      },
      export: {
        title: '结构化导出模式',
        description: '先选站点，再按课程缩小范围，再选要导出的内容，最后导出真正要带走的那一层事实。',
        siteLabel: '站点范围',
        courseLabel: '课程范围',
        formatLabel: '导出格式',
        familyLabel: '导出内容',
        exportButton: '导出当前选择',
        allCourses: '全部课程',
        allSites: '全部站点',
        courseScopedHint: '课程型站点建议先选课程，再选要导出的内容。',
        globalHint: '当前站点更适合按站点整体导出，而不是先选课程。',
        badges: {
          available: '已可导出',
          partial: '部分可导出',
          blocked: '当前不可用',
        },
        families: {
        current_view: {
          label: '当前视图',
          description: '导出当前站点/课程下你正在看的结构化切片。',
        },
        resources: {
          label: '资料 / 文件',
          description: '导出当前范围里已经可见的文件、资料信息和跳转链接。',
        },
        assignments: {
            label: '作业',
            description: '只导出作业、截止时间和提交状态。',
          },
          announcements: {
            label: '公告',
            description: '只导出公告与提醒信号。',
          },
          messages: {
            label: '消息 / 讨论',
            description: '只导出消息、线程摘要与最新沟通事实。',
          },
          grades: {
            label: '成绩',
            description: '导出最近成绩信号；当前还不是完整 gradebook 体验。',
          },
          deadlines: {
            label: '截止时间',
            description: '导出即将到期的作业与 deadline 事件。',
          },
          course_panorama: {
            label: '课程全景',
            description: '导出课程簇、课程网站证据和跨站课程摘要。',
          },
          administrative_snapshot: {
            label: '行政摘要',
            description: '导出 DARS / 学费类高敏感摘要，默认先审阅再导出。',
          },
          cluster_merge_review: {
            label: '合并审查',
            description: '导出课程簇、工作项簇和 possible-match 审核材料。',
          },
          instructor_feedback: {
            label: '老师评语',
            description: '这类信息已经预留位置，但 Canvas 还没把老师评语稳定带到这里。',
          },
          syllabus: {
            label: '课程大纲',
            description: '当前已经能看到 syllabus 摘要和相关资料，但还不是完整正文或完整课程资料线。',
          },
          groups: {
            label: '课程小组',
            description: '当前只能看到部分小组摘要和跳转链接，还不是完整共享视图。',
          },
          recordings: {
            label: '录播',
            description: '当前只能看到部分录播入口和嵌入信息，还不是完整录播导出面。',
          },
        },
      },
	      connection: {
	        title: '连接与信任摘要',
	        description: '默认先自动发现本机常见地址；只有自动发现失败时，才需要手动填写。',
	        autodiscovered: '本地连接已激活',
	        manual: '自定义 AI 路线',
	        none: '本地 AI 路线未就绪',
	        manualUnreachable: '你当前填写的本地 AI 地址不可达。请清空它，或改成可用地址后再试。',
	        resolvedUrl: '当前连接地址',
        checkedUrls: '已尝试地址',
        overrideLabel: '自定义本地 AI 地址',
        overrideHint: '只在自动发现失败，或你确实要连自定义本地地址时再填写。',
        clearOverride: '清空自定义地址',
      },
      authorization: {
        title: '信任中心',
        description: '这里先讲清楚当前能读什么、哪些还只是部分可见，以及哪些仍需要更严格边界。',
        currentReads: '当前可读取的内容',
        plannedReads: '更深读取与当前状态',
      },
      popup: {
        launchTitle: '这张桌面的速览',
        launchDescription: '从这里快速进入助手、导出或信任中心。',
        openAssistant: '打开助手',
        openExport: '快速导出',
        openSettings: '信任中心',
        syncCurrentSite: '同步当前站点',
        quickExportTitle: '快速动作',
        quickExportDescription: '先走一步最直接的动作；更细的审阅再进侧边栏。',
        moreExports: '更多导出捷径',
        fewerExports: '收起额外导出',
      },
    };
  }

  return {
    modeNav: {
      assistant: 'Assistant',
      export: 'Export',
      settings: 'Trust center',
    },
    assistant: {
      title: 'Your campus desk',
      description:
        'Start with the facts, AI route, and next task already visible in this workspace.',
      currentContext: 'Current view',
      visibleFacts: 'What is in view',
      activeConnection: 'Assistant route',
      openExport: 'Open export',
      openSettings: 'Open trust center',
      showWorkspace: 'Open full workspace',
      hideWorkspace: 'Hide full workspace',
      syncCurrentSite: 'Sync current site',
      readOnly: 'Read-only',
      structuredOnly: 'Structured facts only',
      manualOnly: 'High-risk steps stay manual',
      trustSummary:
        'This desk stays grounded in the facts already visible here.',
      noConnection: "AI connection isn't ready yet.",
    },
    export: {
      title: 'Structured export mode',
      description: 'Pick a site, narrow to a course when it helps, choose what to export, then export the exact slice you mean.',
      siteLabel: 'Site scope',
      courseLabel: 'Course scope',
      formatLabel: 'Export format',
      familyLabel: 'What to export',
      exportButton: 'Export selection',
      allCourses: 'All courses',
      allSites: 'All sites',
      courseScopedHint: 'Course-first export works best for course-centric sites before choosing what to export.',
      globalHint: 'This site exports more truthfully at the whole-site level than at the course level.',
      badges: {
        available: 'Exportable now',
        partial: 'Partially exportable',
        blocked: 'Not available yet',
      },
      families: {
        current_view: {
          label: 'Current view',
          description: 'Export the structured slice currently in focus for this site or course.',
        },
        resources: {
          label: 'Resources / files',
          description: 'Export the files, resource details, and jump links already visible in this scope.',
        },
        assignments: {
          label: 'Assignments',
          description: 'Export assignments, due times, and submission state only.',
        },
        announcements: {
          label: 'Announcements',
          description: 'Export announcements and notice-like signals only.',
        },
        messages: {
          label: 'Inbox / discussions',
          description: 'Export message threads, summaries, and the latest communication facts.',
        },
        grades: {
          label: 'Grades',
          description: 'Export recent grade signals; this is still not a full gradebook experience.',
        },
        deadlines: {
          label: 'Deadlines',
          description: 'Export due-soon assignments and deadline events.',
        },
        course_panorama: {
          label: 'Course panorama',
          description: 'Export course clusters, course-website evidence, and cross-site course summaries.',
        },
          administrative_snapshot: {
            label: 'Administrative snapshot',
            description: 'Export DARS/tuition-style high-sensitivity summaries in a review-first packet.',
          },
        cluster_merge_review: {
          label: 'Cluster merge review',
          description: 'Export course clusters, work-item clusters, and possible-match review material.',
        },
        instructor_feedback: {
          label: 'Instructor feedback',
          description: 'This category is reserved, but Canvas does not yet bring instructor feedback here in a stable way.',
        },
        syllabus: {
          label: 'Syllabus',
          description: 'A syllabus summary and related materials are visible now, but this is still not full syllabus body access or a complete course-material lane.',
        },
        groups: {
          label: 'Groups',
          description: 'Canvas currently shows light group summaries and jump links here, but this is still not a complete shared surface.',
        },
        recordings: {
          label: 'Recordings',
          description: 'Canvas currently shows light recording links and embeds here, but this is still not a complete recording export surface.',
        },
      },
    },
    connection: {
      title: 'Connection and trust summary',
      description: 'Try the common local addresses first. Only use a manual address when autodiscovery fails.',
      autodiscovered: 'Local connection active',
      manual: 'Custom AI route',
      none: 'No local AI route',
      manualUnreachable:
        'The custom local AI address is unreachable. Clear it or replace it with a reachable local address.',
      resolvedUrl: 'Active connection',
      checkedUrls: 'Checked addresses',
      overrideLabel: 'Custom local AI URL',
      overrideHint: 'Use this only when autodiscovery fails or you intentionally want a custom local address.',
      clearOverride: 'Clear custom address',
    },
    authorization: {
      title: 'Trust center',
      description:
        'This area explains what the product may read now, what still stays partial, and what still needs a stricter boundary.',
      currentReads: 'Current readable scope',
      plannedReads: 'Deeper reads and current status',
    },
    popup: {
      launchTitle: 'Quick snapshot from your desk',
      launchDescription:
        'Use this popup as a light entry point into assistant, export, or trust center.',
      openAssistant: 'Open assistant',
      openExport: 'Quick export',
      openSettings: 'Trust center',
      syncCurrentSite: 'Sync current site',
      quickExportTitle: 'Fast actions',
      quickExportDescription:
        'Take the quickest next action here, then open the sidepanel when you need the full workspace.',
      moreExports: 'More export shortcuts',
      fewerExports: 'Hide extra export shortcuts',
    },
  };
}
