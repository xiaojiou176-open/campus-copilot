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
        settings: '设置',
      },
      assistant: {
        title: '这页的校园伴随助手',
        description: '先看这页已经落地的事实、当前 readiness，以及学业/行政两条线各自冒出来的重点，再决定是提问、导出，还是检查设置。',
        currentContext: '当前上下文',
        visibleFacts: '当前可见事实',
        activeConnection: '当前 readiness',
        openExport: '导出这页事实',
        openSettings: '打开设置与信任中心',
        showWorkspace: '展开详细工作台',
        hideWorkspace: '收起详细工作台',
        syncCurrentSite: '同步当前站点',
        readOnly: '只读',
        structuredOnly: '仅基于结构化事实',
        manualOnly: '红区动作仍需你手动完成',
        trustSummary: '当前只基于这页已经导入或可见的结构化事实继续工作，并把学业与行政信号放在同一张桌面上分组看。',
        noConnection: '本地 AI 路线还没就绪。',
      },
      export: {
        title: '结构化导出模式',
        description: '先选站点，再选课程，再选资源族，最后导出你真正要带走的那一层事实。',
        siteLabel: '站点范围',
        courseLabel: '课程范围',
        formatLabel: '导出格式',
        familyLabel: '资源族',
        exportButton: '导出当前选择',
        allCourses: '全部课程',
        allSites: '全部站点',
        courseScopedHint: '课程型站点建议先选课程，再选资源族。',
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
          description: '导出当前站点已落地的文件、资料元数据与跳转链接。',
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
            label: 'Inbox / 讨论',
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
            description: '导出 DARS / 学费类高敏感摘要，默认走 review-first。',
          },
          cluster_merge_review: {
            label: 'Merge 账本',
            description: '导出课程簇、工作项簇和 possible-match 审核材料。',
          },
          instructor_feedback: {
            label: '老师评语',
            description: '共享 schema 有位置，但 Canvas 还没把这条链真正打通。',
          },
          syllabus: {
            label: 'Syllabus',
            description: '当前已有 syllabus summary/resource lane，但还不是 raw syllabus 正文或完整课程资料线。',
          },
          groups: {
            label: 'Groups',
            description: '当前已有 partial group summary/link carrier，但还没成为 landed 的完整共享产品面。',
          },
          recordings: {
            label: '录播',
            description: '当前已有 partial media/embed carrier，但还不是 richer recording parity 或完整导出面。',
          },
        },
      },
      connection: {
        title: '连接与 trust 摘要',
        description: '默认先自动发现本机常见地址；只有自动发现失败时，才需要手动覆盖。',
        autodiscovered: '自动发现',
        manual: '手动覆盖',
        none: '未发现',
        manualUnreachable: '你当前手填的地址不可达；当前界面不会自动回退到别的地址，请改回可用的本地 BFF 地址或清空手填项后再试。',
        resolvedUrl: '当前连接地址',
        checkedUrls: '已尝试地址',
        overrideLabel: '手动 BFF 地址',
        overrideHint: '只在自动发现失败或你要连自定义本地地址时再填写。',
        clearOverride: '清空手动地址',
      },
      authorization: {
        title: '读取边界与信任中心',
        description: '这里先讲清楚当前已 landed 的读取面、partial 面与 blocked 面；完整授权状态机由另一条 lane 继续接线。',
        currentReads: '当前正式读取面',
        plannedReads: '更深读取与当前状态',
      },
      popup: {
        launchTitle: '从这页继续',
        launchDescription: 'Popup 只做 launcher：打开助手、进入导出，或去设置与信任中心，不把自己做成第二块工作台。',
        openAssistant: '打开助手',
        openExport: '快速导出',
        openSettings: '设置与授权',
        syncCurrentSite: '同步当前站点',
        quickExportTitle: '轻量导出捷径',
        quickExportDescription: '先拿走一小片有用事实；如果要更细的范围和审阅，再进入侧边栏导出模式。',
        moreExports: '更多导出捷径',
        fewerExports: '收起额外导出',
      },
    };
  }

  return {
    modeNav: {
      assistant: 'Assistant',
      export: 'Export',
      settings: 'Settings',
    },
    assistant: {
      title: 'Your campus companion for this page',
      description:
        'Start with the facts already on this page, check readiness, and notice what is surfacing as academic work versus administrative signals before you ask, export, or review settings.',
      currentContext: 'Current context',
      visibleFacts: 'Visible facts',
      activeConnection: 'Current readiness',
      openExport: 'Export this page',
      openSettings: 'Open settings and trust center',
      showWorkspace: 'Show detailed workspace',
      hideWorkspace: 'Hide detailed workspace',
      syncCurrentSite: 'Sync current site',
      readOnly: 'Read-only',
      structuredOnly: 'Structured facts only',
      manualOnly: 'Manual-only red zones stay with you',
      trustSummary:
        'Campus Copilot stays grounded in the structured facts already imported or visible for this page, with academic and administrative signals grouped on one desk.',
      noConnection: 'No local AI route is ready yet.',
    },
    export: {
      title: 'Structured export mode',
      description: 'Pick a site, narrow to a course when it helps, choose a resource family, then export the exact slice you mean.',
      siteLabel: 'Site scope',
      courseLabel: 'Course scope',
      formatLabel: 'Export format',
      familyLabel: 'Resource family',
      exportButton: 'Export selection',
      allCourses: 'All courses',
      allSites: 'All sites',
      courseScopedHint: 'Course-first export works best for course-centric sites.',
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
          description: 'Export the currently landed files, resource metadata, and jump links for this scope.',
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
          description: 'The schema has room for it, but Canvas does not yet deliver it as a real carrier.',
        },
        syllabus: {
          label: 'Syllabus',
          description: 'A syllabus summary/resource lane now exists, but this is still not raw syllabus-body access or a full course-material lane.',
        },
        groups: {
          label: 'Groups',
          description: 'Canvas now has a partial group summary/link carrier, but it is not yet a fully landed shared product surface.',
        },
        recordings: {
          label: 'Recordings',
          description: 'Canvas now has a partial media/embed carrier, but it is not yet richer recording parity or a complete export surface.',
        },
      },
    },
    connection: {
      title: 'Connection and trust summary',
      description: 'Try the common local addresses first. Only fall back to a manual override when autodiscovery fails.',
      autodiscovered: 'Autodiscovered',
      manual: 'Manual override',
      none: 'Not found',
      manualUnreachable:
        'The manual BFF address is unreachable. The current surface does not fall back automatically, so clear the override or enter a reachable local BFF address.',
      resolvedUrl: 'Active connection',
      checkedUrls: 'Checked addresses',
      overrideLabel: 'Manual BFF base URL',
      overrideHint: 'Use this only when autodiscovery fails or you intentionally want a custom local address.',
      clearOverride: 'Clear manual address',
    },
    authorization: {
      title: 'Reading boundaries and trust center',
      description:
        'This area explains which reads are landed, which remain partial, and which still have no lawful carrier. The full authorization state machine lands in the separate policy lane.',
      currentReads: 'Current formal reads',
      plannedReads: 'Deeper reads and current status',
    },
    popup: {
      launchTitle: 'Launch from this page',
      launchDescription:
        'Keep the popup in launcher mode: open the assistant, jump into export, or review settings/auth without turning this into a second dashboard.',
      openAssistant: 'Open assistant',
      openExport: 'Quick export',
      openSettings: 'Settings/Auth',
      syncCurrentSite: 'Sync current site',
      quickExportTitle: 'Light export shortcuts',
      quickExportDescription:
        'Take one small slice with you here. Move into the sidepanel export flow when you need a fuller review.',
      moreExports: 'More export shortcuts',
      fewerExports: 'Hide extra export shortcuts',
    },
  };
}
