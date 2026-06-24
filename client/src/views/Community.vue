<template>
  <div class="community-page">
    <AppNavBar title="社区">
      <template slot="actions">
        <button class="nav-action-btn" @click="openCreatePost" title="发帖">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
      </template>
    </AppNavBar>
    <div class="community-body">
      <div class="community-sidebar">
        <div class="sidebar-divider"></div>
        <div class="sidebar-menu">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="sidebar-menu-item"
            :class="{ active: activeTab === tab.key }"
            @click="switchTab(tab.key)"
          >
            <i :class="tab.icon"></i>
            <span>{{ tab.label }}</span>
          </button>
        </div>
      </div>

      <div class="community-content">
        <!-- 论坛 -->
        <div v-if="activeTab === 'forum'" class="content-panel">
          <div class="content-header">
            <h2 class="content-title">论坛</h2>
            <div class="header-actions">
              <div class="sort-options">
                <button class="sort-btn" :class="{ active: sortMode === 'latest' }" @click="changeSort('latest')">最新</button>
                <button class="sort-btn" :class="{ active: sortMode === 'hot' }" @click="changeSort('hot')">最热</button>
                <button class="sort-btn" :class="{ active: sortMode === 'featured' }" @click="changeSort('featured')"><i class="fa-solid fa-star" style="margin-right:3px;font-size:11px;color:#FF9500"></i>精选</button>
              </div>
              <div class="search-box">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input
                  class="search-input"
                  v-model="searchKeyword"
                  placeholder="搜索帖子..."
                  @keyup.enter="doSearch"
                  @input="onSearchInput"
                />
                <button v-if="searchKeyword" class="search-clear" @click="clearSearch">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
              <button class="btn-primary btn-create" @click="openCreatePost">
                <i class="fa-solid fa-plus"></i> 发帖
              </button>
            </div>
          </div>
          <!-- 标签过滤 -->
          <div v-if="tagList.length > 0" class="tag-filter-bar">
            <button
              class="tag-filter-chip"
              :class="{ active: !selectedTag }"
              @click="selectTag('')"
            >全部</button>
            <button
              v-for="tag in tagList"
              :key="tag"
              class="tag-filter-chip"
              :class="{ active: selectedTag === tag }"
              @click="selectTag(tag)"
            >{{ tag }}</button>
          </div>
          <!-- 下拉刷新指示器 -->
          <div class="pull-refresh-indicator" :style="{ opacity: Math.min(pullRefreshY / 60, 1) }">
            <i :class="isRefreshing ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-arrow-down'"></i>
            <span>{{ isRefreshing ? '刷新中...' : '下拉刷新' }}</span>
          </div>
          <div
            class="content-list scrollbar-thin"
            :style="pullRefreshStyle"
            @scroll="onPostsScroll"
            @touchstart="onPullStart"
            @touchmove="onPullMove"
            @touchend="onPullEnd"
          >
            <!-- 骨架屏加载 -->
            <div v-if="loading && displayPosts.length === 0" class="skeleton-list">
              <div v-for="i in 5" :key="'sk'+i" class="skeleton-item">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-lines">
                  <div class="skeleton-line" style="width:40%"></div>
                  <div class="skeleton-line" style="width:80%"></div>
                  <div class="skeleton-line" style="width:60%"></div>
                </div>
              </div>
            </div>
            <div
              v-for="post in displayPosts"
              :key="post.id"
              class="list-item post-item"
              :class="{ active: currentPostId === post.id }"
              @click="selectPost(post)"
            >
              <UserAvatar
                :userId="post.user_id"
                :name="post.is_anonymous ? '' : (post.net_name || '')"
                :isAnonymous="!!post.is_anonymous"
                :size="40"
                @click.stop="!post.is_anonymous && showUserProfile(post.user_id)"
              />
              <div class="post-info">
                <div class="post-meta">
                  <span class="post-author">{{ post.is_anonymous && canViewAnonymous ? post.admin_net_name : (post.is_anonymous ? '匿名用户' : (post.net_name || '未知用户')) }}</span>
                  <span v-if="!post.is_anonymous && userLevels[post.user_id] && userLevels[post.user_id].role === 'admin'" class="admin-badge-sm">管理</span>
                  <span v-if="post.is_anonymous && canViewAnonymous && post.admin_net_name" class="admin-anonymous-badge">匿名</span>
                  <span v-if="post.relayed_from" class="remote-badge">跨班</span>
                  <img v-if="!post.is_anonymous && userLevels[post.user_id] && userLevels[post.user_id].show_level_community" :src="'/resources/public/level/Lv' + userLevels[post.user_id].level + '.svg'" class="level-icon level-icon-sm" />
                  <span v-if="post.type === 'food'" class="post-type-badge food">美食</span>
              <span v-if="post.type === 'hot'" class="post-type-badge hot">热事</span>
              <span v-if="post.type === 'poll'" class="post-type-badge poll">投票</span>
              <span v-if="post.type === 'survey'" class="post-type-badge survey">问卷</span>
                  <span class="post-time">{{ formatTime(post.created_at) }}</span>
                </div>
                <div v-if="post.title" class="post-title">{{ post.title }}</div>
                <span v-if="post.featured" class="featured-badge"><i class="fa-solid fa-star"></i> 精选</span>
                <div v-if="post.type === 'poll'" class="post-poll">
                  <div v-for="(opt, idx) in getPollOptions(post)" :key="idx" class="poll-option" :class="{ voted: hasVoted(post), selected: getUserVote(post) && getUserVote(post).indexOf(idx) > -1, 'multi-selected': !hasVoted(post) && isPollMultiple(post) && getPollSelections(post).indexOf(idx) > -1, 'single-selected': !hasVoted(post) && !isPollMultiple(post) && pollSingleSelections[String(post.id)] === idx }" @click.stop="votePoll(post, idx)">
                    <div class="poll-option-bar" :class="{ 'bar-leading': hasVoted(post) && getPollPercent(post, idx) === Math.max.apply(null, getPollOptions(post).map(function(_, i) { return getPollPercent(post, i); })) && getPollPercent(post, idx) > 0 }" :style="{ width: (hasVoted(post) ? getPollPercent(post, idx) : 0) + '%' }"></div>
                    <span class="poll-option-check" v-if="!hasVoted(post) && isPollMultiple(post)"><i :class="getPollSelections(post).indexOf(idx) > -1 ? 'fa-solid fa-square-check' : 'fa-regular fa-square'"></i></span>
                    <span class="poll-option-check" v-if="!hasVoted(post) && !isPollMultiple(post)"><i :class="pollSingleSelections[String(post.id)] === idx ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'"></i></span>
                    <span class="poll-option-text">{{ opt }}</span>
                    <span v-if="hasVoted(post)" class="poll-option-pct">{{ getPollPercent(post, idx) }}%<small class="poll-option-count">({{ getPollVoteCount(post, idx) }}票)</small></span>
                  </div>
                  <div class="poll-meta">
                    <span>{{ getPollTotal(post) }} 人参与投票</span>
                    <span v-if="isPollMultiple(post) && !hasVoted(post)" class="poll-multi-hint">（可多选，最多{{ getPollMaxChoices(post) }}项）</span>
                    <button v-if="isPostOwner(post) && getPollTotal(post) > 0" class="poll-view-results-btn" @click.stop="viewResults(post)"><i class="fa-solid fa-chart-bar"></i> 查看结果</button>
                  </div>
                  <button v-if="isPollMultiple(post) && !hasVoted(post) && getPollSelections(post).length > 0" class="btn-primary poll-submit-btn" @click.stop="submitPollVote(post)">确认投票</button>
                  <button v-if="!isPollMultiple(post) && !hasVoted(post) && pollSingleSelections[String(post.id)] !== undefined && pollSingleSelections[String(post.id)] !== null" class="btn-primary poll-submit-btn" @click.stop="submitSinglePollVote(post)">确认投票</button>
                </div>
                <div v-else-if="post.type === 'survey'" class="post-survey">
                  <div v-for="(q, qIdx) in getSurveyQuestions(post)" :key="qIdx" class="survey-q-preview">
                    <div class="survey-q-title">{{ qIdx + 1 }}. {{ q.question }} <span class="survey-q-type-tag">{{ q.type === 'text' ? '文本' : (q.type === 'single' ? '单选' : '多选') }}</span></div>
                    <div v-if="q.type === 'text'" class="survey-q-text-area">
                      <div v-if="hasVoted(post)" class="survey-voted-text">{{ getUserSurveyAnswer(post, qIdx) || '未回答' }}</div>
                      <textarea v-else class="survey-text-input" placeholder="输入你的回答..." @input="updateSurveyText(post, qIdx, $event.target.value)" rows="2"></textarea>
                    </div>
                    <div v-else class="survey-q-options-interactive">
                      <div v-for="(opt, oIdx) in (q.options || [])" :key="oIdx" class="survey-opt-item" :class="{ selected: hasVoted(post) ? (Array.isArray(getUserSurveyAnswer(post, qIdx)) ? getUserSurveyAnswer(post, qIdx).indexOf(oIdx) > -1 : getUserSurveyAnswer(post, qIdx) === oIdx) : isSurveyOptionSelected(post, qIdx, oIdx) }" @click.stop="!hasVoted(post) && selectSurveyOption(post, qIdx, oIdx)">
                        <span class="survey-opt-check">
                          <i v-if="q.type === 'multiple'" :class="isSurveyOptionSelected(post, qIdx, oIdx) || (hasVoted(post) && Array.isArray(getUserSurveyAnswer(post, qIdx)) && getUserSurveyAnswer(post, qIdx).indexOf(oIdx) > -1) ? 'fa-solid fa-square-check' : 'fa-regular fa-square'"></i>
                          <i v-else :class="isSurveyOptionSelected(post, qIdx, oIdx) || (hasVoted(post) && getUserSurveyAnswer(post, qIdx) === oIdx) ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'"></i>
                        </span>
                        <span class="survey-opt-text">{{ opt }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="poll-meta">
                    <span>{{ getSurveyTotal(post) }} 人参与</span>
                    <button v-if="isPostOwner(post) && getSurveyTotal(post) > 0" class="poll-view-results-btn" @click.stop="viewResults(post)"><i class="fa-solid fa-clipboard-list"></i> 查看结果</button>
                  </div>
                  <button v-if="!hasVoted(post)" class="btn-primary poll-submit-btn" @click.stop="submitSurveyVote(post)">提交问卷</button>
                </div>
                <div v-else class="post-preview markdown-body" v-html="renderMarkdown(post.content)"></div>
                <div v-if="getPlaylistShare(post)" class="playlist-share-card" @click.stop="openPlaylistFromPost(post)">
                  <div class="playlist-share-icon"><i class="fa-solid fa-music"></i></div>
                  <div class="playlist-share-info">
                    <div class="playlist-share-name">{{ getPlaylistShare(post).playlist_name || '歌单' }}</div>
                    <div class="playlist-share-meta">{{ getPlaylistShare(post).song_count || 0 }} 首歌曲</div>
                  </div>
                  <i class="fa-solid fa-chevron-right playlist-share-arrow"></i>
                </div>
                <div class="post-tags" v-if="post.tags && post.tags.length > 0">
                  <span v-for="tag in post.tags" :key="tag" class="tag-badge" @click.stop="selectTag(tag)">{{ tag }}</span>
                </div>
                <div class="post-stats">
                  <span class="stat-item" :class="{ liked: post.liked }">
                    <i :class="post.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i> {{ post.like_count || 0 }}
                  </span>
                  <span class="stat-item"><i class="fa-regular fa-comment"></i> {{ post.comment_count || 0 }}</span>
                  <span v-if="post.share_count" class="stat-item"><i class="fa-solid fa-share"></i> {{ post.share_count }}</span>
                </div>
              </div>
            </div>
            <div v-if="displayPosts.length === 0 && !loading" class="empty-state">
              <div class="empty-illustration">
                <i :class="sortMode === 'featured' ? 'fa-regular fa-star' : 'fa-regular fa-comments'"></i>
              </div>
              <p class="empty-title">{{ sortMode === 'featured' ? '暂无精选帖子' : (searchKeyword ? '没有找到相关帖子' : '暂无帖子') }}</p>
              <p class="empty-desc">{{ sortMode === 'featured' ? '优质帖子将被管理员设为精选' : (searchKeyword ? '试试其他关键词吧' : '快来发第一条帖子吧') }}</p>
              <button v-if="sortMode !== 'featured' && !searchKeyword" class="btn-primary" @click="openCreatePost">
                <i class="fa-solid fa-pen-to-square"></i> 发第一条帖子
              </button>
            </div>
            <div v-if="loading && displayPosts.length > 0" class="loading-state">
              <i class="fa-solid fa-spinner fa-spin"></i>
              <span>加载中...</span>
            </div>
            <div v-if="postsLoadingMore" class="loading-more-indicator">
              <div class="spinner-small"></div>
            </div>
            <div v-if="!postsHasMore && (posts && posts.length > 0)" class="no-more-posts">没有更多帖子了</div>
          </div>
        </div>

        <!-- 美食榜 -->
        <div v-if="activeTab === 'food'" class="content-panel">
          <div class="content-header">
            <h2 class="content-title"><i class="fa-solid fa-utensils" style="color:var(--accent-community);margin-right:8px"></i>美食榜</h2>
            <button class="btn-primary btn-create" @click="showCreateFood = true">
              <i class="fa-solid fa-plus"></i> 推荐
            </button>
          </div>
          <div class="content-list scrollbar-thin">
            <div
              v-for="(item, index) in foodRanking"
              :key="item.id"
              class="list-item ranking-item"
              @click="selectRankingPost(item)"
            >
              <div class="ranking-number" :class="'rank-' + (index + 1)">{{ index + 1 }}</div>
              <div class="ranking-info">
                <div class="ranking-title">{{ item.dish_name }}</div>
                <div class="ranking-sub">
                  <span v-if="item.canteen"><i class="fa-solid fa-store"></i> {{ item.canteen }}</span>
                  <span v-if="item.window"> · {{ item.window }}</span>
                </div>
                <div class="ranking-author" v-if="!item.is_anonymous || canViewAnonymous">
                  <i class="fa-regular fa-user"></i> {{ item.is_anonymous && canViewAnonymous ? (item.admin_net_name || '未知用户') : (item.net_name || '未知用户') }}
                  <span v-if="item.is_anonymous && canViewAnonymous && item.admin_net_name" class="admin-anonymous-badge">匿名</span>
                </div>
              </div>
              <div class="ranking-actions">
                <button class="btn-like" :class="{ liked: item.liked }" @click.stop="likeRanking('food', item)">
                  <i :class="item.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
                  <span class="like-count">{{ item.like_count || 0 }}</span>
                </button>
                <button class="btn-forward-sm" @click.stop="forwardToChat(item)" title="转发">
                  <i class="fa-solid fa-share"></i>
                </button>
              </div>
            </div>
            <LoadingSkeleton v-if="foodLoading" type="list" :count="3" />
            <div v-else-if="foodRanking.length === 0" class="empty-state">
              <div class="empty-illustration">
                <i class="fa-solid fa-bowl-food"></i>
              </div>
              <p class="empty-title">暂无美食推荐</p>
              <p class="empty-desc">快来推荐第一道菜吧</p>
              <button class="btn-primary" @click="showCreateFood = true">
                <i class="fa-solid fa-plus"></i> 推荐美食
              </button>
            </div>
          </div>
        </div>

        <!-- 热事榜 -->
        <div v-if="activeTab === 'hot'" class="content-panel">
          <div class="content-header">
            <h2 class="content-title"><i class="fa-solid fa-fire" style="color:var(--danger-color);margin-right:8px"></i>热事榜</h2>
            <button class="btn-primary btn-create" @click="showCreateHot = true">
              <i class="fa-solid fa-plus"></i> 爆料
            </button>
          </div>
          <div class="content-list scrollbar-thin">
            <div
              v-for="(item, index) in hotRanking"
              :key="item.id"
              class="list-item ranking-item hot-item"
              @click="selectRankingPost(item)"
            >
              <div class="ranking-number" :class="'rank-' + (index + 1)">{{ index + 1 }}</div>
              <div class="ranking-info">
                <div class="ranking-title">{{ item.title }}</div>
                <div class="ranking-sub">{{ (item.detail || '').substring(0, 50) }}</div>
                <div class="ranking-meta">
                  <span v-if="item.location" class="ranking-location"><i class="fa-solid fa-location-dot"></i> {{ item.location }}</span>
                  <span v-if="!item.is_anonymous || canViewAnonymous" class="ranking-author"><i class="fa-regular fa-user"></i> {{ item.is_anonymous && canViewAnonymous ? (item.admin_net_name || '未知用户') : (item.net_name || '未知用户') }}<span v-if="item.is_anonymous && canViewAnonymous && item.admin_net_name" class="admin-anonymous-badge">匿名</span></span>
                </div>
              </div>
              <div class="ranking-actions">
                <button class="btn-like" :class="{ liked: item.liked }" @click.stop="likeRanking('hot', item)">
                  <i :class="item.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
                  <span class="like-count">{{ item.like_count || 0 }}</span>
                </button>
                <button class="btn-forward-sm" @click.stop="forwardToChat(item)" title="转发">
                  <i class="fa-solid fa-share"></i>
                </button>
              </div>
            </div>
            <LoadingSkeleton v-if="hotLoading" type="list" :count="3" />
            <div v-else-if="hotRanking.length === 0" class="empty-state">
              <div class="empty-illustration">
                <i class="fa-solid fa-fire-flame-curved"></i>
              </div>
              <p class="empty-title">暂无热事爆料</p>
              <p class="empty-desc">快来爆料第一条热事吧</p>
              <button class="btn-primary" @click="showCreateHot = true">
                <i class="fa-solid fa-plus"></i> 爆料热事
              </button>
            </div>
          </div>
        </div>

        <!-- 我的 -->
        <div v-if="activeTab === 'mine'" class="content-panel mine-panel">
          <div class="content-header">
            <h2 class="content-title">个人中心</h2>
          </div>
          <div class="mine-body scrollbar-thin">
            <div class="profile-card" v-if="currentUser">
              <div class="profile-card-left">
                <div class="profile-card-avatar" :style="{ background: getAvatarColor(currentUser.user_id) }">
                  {{ (currentUser.net_name || '?').charAt(0) }}
                </div>
                <div class="profile-card-info">
                  <div class="profile-card-name">{{ currentUser.net_name }}</div>
                  <div class="profile-card-id">{{ currentUser.real_name }} · {{ currentUser.user_id }}</div>
                  <div v-if="profile && profile.signature" class="profile-card-signature">{{ profile.signature }}</div>
                </div>
              </div>
              <div class="profile-card-stats">
                <div class="stat-block">
                  <div class="stat-value">{{ myStats.post_count || 0 }}</div>
                  <div class="stat-label">帖子</div>
                </div>
                <div class="stat-block">
                  <div class="stat-value">{{ myStats.like_count || 0 }}</div>
                  <div class="stat-label">获赞</div>
                </div>
                <div class="stat-block">
                  <div class="stat-value">{{ myStats.comment_count || 0 }}</div>
                  <div class="stat-label">评论</div>
                </div>
              </div>
            </div>

            <div class="mine-columns">
              <div class="mine-column">
                <div class="my-posts-section">
                  <h3 class="section-title">我的帖子 ({{ myPostsTotal }})</h3>
                  <div
                    v-for="post in myPosts"
                    :key="post.id"
                    class="list-item post-item my-post-item"
                    @click="selectPost(post)"
                  >
                    <div class="post-info">
                      <div class="post-meta">
                        <span v-if="post.type === 'food'" class="post-type-badge food">美食</span>
                        <span v-if="post.type === 'hot'" class="post-type-badge hot">热事</span>
                        <span v-if="post.type === 'poll'" class="post-type-badge poll">投票</span>
                        <span v-if="post.type === 'survey'" class="post-type-badge survey">问卷</span>
                        <span v-if="post.anonymous" class="post-type-badge anon">匿名</span>
                      </div>
                      <div v-if="post.title" class="post-title">{{ post.title }}</div>
                      <div class="post-preview markdown-body" v-html="renderMarkdown(post.content)"></div>
                      <div class="post-stats">
                        <span class="stat-item"><i class="fa-regular fa-heart"></i> {{ post.like_count || 0 }}</span>
                        <span class="stat-item"><i class="fa-regular fa-comment"></i> {{ post.comment_count || 0 }}</span>
                        <span class="post-time">{{ formatTime(post.created_at) }}</span>
                      </div>
                    </div>
                    <button class="btn-delete" @click="confirmDeletePost(post.id)">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                  <div v-if="myPosts.length === 0" class="empty-state-sm">
                    <i class="fa-regular fa-face-meh"></i>
                    <span>暂无帖子</span>
                  </div>
                </div>
              </div>

              <div class="mine-column">
                <div class="bookmarks-section">
                  <h3 class="section-title"><i class="fa-solid fa-bookmark" style="color:var(--accent-community);margin-right:6px"></i>收藏</h3>
                  <div
                    v-for="post in bookmarks"
                    :key="post.id"
                    class="list-item post-item"
                    :class="{ active: currentPostId === post.id }"
                    @click="selectPost(post)"
                  >
                    <UserAvatar
                      :userId="post.user_id"
                      :name="post.is_anonymous ? '' : (post.net_name || '')"
                      :isAnonymous="!!post.is_anonymous"
                      :size="40"
                      @click.stop="!post.is_anonymous && showUserProfile(post.user_id)"
                    />
                    <div class="post-info">
                      <div class="post-meta">
                        <span class="post-author">{{ post.is_anonymous && canViewAnonymous ? post.admin_net_name : (post.is_anonymous ? '匿名用户' : (post.net_name || '未知用户')) }}</span>
                        <span v-if="!post.is_anonymous && userLevels[post.user_id] && userLevels[post.user_id].role === 'admin'" class="admin-badge-sm">管理</span>
                        <span v-if="post.is_anonymous && canViewAnonymous && post.admin_net_name" class="admin-anonymous-badge">匿名</span>
                        <img v-if="!post.is_anonymous && userLevels[post.user_id] && userLevels[post.user_id].show_level_community" :src="'/resources/public/level/Lv' + userLevels[post.user_id].level + '.svg'" class="level-icon level-icon-sm" />
                        <span v-if="post.type === 'food'" class="post-type-badge food">美食</span>
                        <span v-if="post.type === 'hot'" class="post-type-badge hot">热事</span>
                        <span v-if="post.type === 'poll'" class="post-type-badge poll">投票</span>
                        <span v-if="post.type === 'survey'" class="post-type-badge survey">问卷</span>
                        <span class="post-time">{{ formatTime(post.created_at) }}</span>
                      </div>
                      <div v-if="post.title" class="post-title">{{ post.title }}</div>
                      <span v-if="post.featured" class="featured-badge"><i class="fa-solid fa-star"></i> 精选</span>
                      <div class="post-preview markdown-body" v-html="renderMarkdown(post.content)"></div>
                      <div class="post-tags" v-if="post.tags && post.tags.length > 0">
                        <span v-for="tag in post.tags" :key="tag" class="tag-badge" @click.stop="selectTag(tag)">{{ tag }}</span>
                      </div>
                      <div class="post-stats">
                        <span class="stat-item" :class="{ liked: post.liked }">
                          <i :class="post.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i> {{ post.like_count || 0 }}
                        </span>
                        <span class="stat-item"><i class="fa-regular fa-comment"></i> {{ post.comment_count || 0 }}</span>
                        <span v-if="post.share_count" class="stat-item"><i class="fa-solid fa-share"></i> {{ post.share_count }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="bookmarks.length === 0" class="empty-state-sm">
                    <i class="fa-regular fa-bookmark"></i>
                    <span>暂无收藏</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 全屏帖子详情 -->
    <transition name="detail-slide">
      <div v-if="showFullDetail && currentPost" class="full-detail-overlay">
        <div class="full-detail-header">
          <button class="full-detail-back" @click="closeFullDetail">
            <i class="fa-solid fa-arrow-left"></i>
            <span>返回</span>
          </button>
          <div class="full-detail-header-title">帖子详情</div>
          <button
            v-if="canManageFeatured"
            class="btn-featured-toggle"
            :class="{ featured: currentPost.featured }"
            @click="toggleFeatured(currentPost)"
            :title="currentPost.featured ? '取消精选' : '设为精选'"
          >
            <i :class="currentPost.featured ? 'fa-solid fa-star' : 'fa-regular fa-star'"></i>
          </button>
          <button
            v-if="isPostOwner(currentPost)"
            class="btn-delete-detail"
            @click="confirmDeletePost(currentPost.id)"
            title="删除帖子"
          >
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
        <div class="full-detail-body scrollbar-thin">
          <div class="full-detail-author">
            <UserAvatar
              :userId="currentPost.user_id"
              :name="currentPost.is_anonymous ? '' : (currentPost.net_name || '')"
              :isAnonymous="!!currentPost.is_anonymous"
              :size="48"
              @click="!currentPost.is_anonymous && showUserProfile(currentPost.user_id)"
            />
            <div class="full-detail-author-info">
              <span class="full-detail-author-name">{{ currentPost.is_anonymous && canViewAnonymous ? currentPost.admin_net_name : (currentPost.is_anonymous ? '匿名用户' : (currentPost.net_name || '未知用户')) }}</span>
              <span v-if="!currentPost.is_anonymous && userLevels[currentPost.user_id] && userLevels[currentPost.user_id].role === 'admin'" class="admin-badge-sm">管理</span>
              <span v-if="currentPost.is_anonymous && canViewAnonymous && currentPost.admin_net_name" class="admin-anonymous-badge">匿名</span>
              <img v-if="!currentPost.is_anonymous && userLevels[currentPost.user_id] && userLevels[currentPost.user_id].show_level_community" :src="'/resources/public/level/Lv' + userLevels[currentPost.user_id].level + '.svg'" class="level-icon level-icon-sm" style="vertical-align: middle;" />
              <span class="full-detail-author-time">{{ formatTime(currentPost.created_at) }}</span>
            </div>
          </div>
          <div v-if="currentPost.type === 'food'" class="detail-type-banner food">
            <i class="fa-solid fa-utensils"></i> 美食推荐
            <span v-if="currentPost.title" class="detail-dish-name">{{ currentPost.title }}</span>
          </div>
          <div v-if="currentPost.type === 'hot'" class="detail-type-banner hot">
            <i class="fa-solid fa-fire"></i> 热事爆料
            <span v-if="currentPost.title" class="detail-hot-title">{{ currentPost.title }}</span>
          </div>
          <div v-if="currentPost.type === 'poll'" class="detail-type-banner poll">
            <i class="fa-solid fa-square-poll-vertical"></i> 投票
            <span v-if="currentPost.title" class="detail-hot-title">{{ currentPost.title }}</span>
          </div>
          <div v-if="currentPost.type === 'survey'" class="detail-type-banner survey">
            <i class="fa-solid fa-clipboard-list"></i> 问卷
            <span v-if="currentPost.title" class="detail-hot-title">{{ currentPost.title }}</span>
          </div>
          <div v-if="currentPost.type === 'poll'" class="detail-poll">
            <div v-for="(opt, idx) in getPollOptions(currentPost)" :key="idx" class="poll-option" :class="{ voted: hasVoted(currentPost), selected: getUserVote(currentPost) && getUserVote(currentPost).indexOf(idx) > -1, 'multi-selected': !hasVoted(currentPost) && isPollMultiple(currentPost) && getPollSelections(currentPost).indexOf(idx) > -1, 'single-selected': !hasVoted(currentPost) && !isPollMultiple(currentPost) && pollSingleSelections[String(currentPost.id)] === idx }" @click="votePoll(currentPost, idx)">
              <div class="poll-option-bar" :class="{ 'bar-leading': hasVoted(currentPost) && getPollPercent(currentPost, idx) === Math.max.apply(null, getPollOptions(currentPost).map(function(_, i) { return getPollPercent(currentPost, i); })) && getPollPercent(currentPost, idx) > 0 }" :style="{ width: (hasVoted(currentPost) ? getPollPercent(currentPost, idx) : 0) + '%' }"></div>
              <span class="poll-option-check" v-if="!hasVoted(currentPost) && isPollMultiple(currentPost)"><i :class="getPollSelections(currentPost).indexOf(idx) > -1 ? 'fa-solid fa-square-check' : 'fa-regular fa-square'"></i></span>
              <span class="poll-option-check" v-if="!hasVoted(currentPost) && !isPollMultiple(currentPost)"><i :class="pollSingleSelections[String(currentPost.id)] === idx ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'"></i></span>
              <span class="poll-option-text">{{ opt }}</span>
              <span v-if="hasVoted(currentPost)" class="poll-option-pct">{{ getPollPercent(currentPost, idx) }}%<small class="poll-option-count">({{ getPollVoteCount(currentPost, idx) }}票)</small></span>
            </div>
            <div class="poll-meta">
              <span>{{ getPollTotal(currentPost) }} 人参与投票</span>
              <span v-if="isPollMultiple(currentPost) && !hasVoted(currentPost)" class="poll-multi-hint">（可多选，最多{{ getPollMaxChoices(currentPost) }}项）</span>
              <button v-if="isPostOwner(currentPost) && getPollTotal(currentPost) > 0" class="poll-view-results-btn" @click="viewResults(currentPost)"><i class="fa-solid fa-chart-bar"></i> 查看结果</button>
            </div>
            <button v-if="isPollMultiple(currentPost) && !hasVoted(currentPost) && getPollSelections(currentPost).length > 0" class="btn-primary poll-submit-btn" @click="submitPollVote(currentPost)">确认投票</button>
            <button v-if="!isPollMultiple(currentPost) && !hasVoted(currentPost) && pollSingleSelections[String(currentPost.id)] !== undefined && pollSingleSelections[String(currentPost.id)] !== null" class="btn-primary poll-submit-btn" @click="submitSinglePollVote(currentPost)">确认投票</button>
          </div>
          <div v-if="currentPost.type === 'survey'" class="detail-survey">
            <div v-for="(q, qIdx) in getSurveyQuestions(currentPost)" :key="qIdx" class="survey-q-preview">
              <div class="survey-q-title">{{ qIdx + 1 }}. {{ q.question }} <span class="survey-q-type-tag">{{ q.type === 'text' ? '文本' : (q.type === 'single' ? '单选' : '多选') }}</span></div>
              <div v-if="q.type === 'text'" class="survey-q-text-area">
                <div v-if="hasVoted(currentPost)" class="survey-voted-text">{{ getUserSurveyAnswer(currentPost, qIdx) || '未回答' }}</div>
                <textarea v-else class="survey-text-input" placeholder="输入你的回答..." @input="updateSurveyText(currentPost, qIdx, $event.target.value)" rows="2"></textarea>
              </div>
              <div v-else class="survey-q-options-interactive">
                <div v-for="(opt, oIdx) in (q.options || [])" :key="oIdx" class="survey-opt-item" :class="{ selected: hasVoted(currentPost) ? (Array.isArray(getUserSurveyAnswer(currentPost, qIdx)) ? getUserSurveyAnswer(currentPost, qIdx).indexOf(oIdx) > -1 : getUserSurveyAnswer(currentPost, qIdx) === oIdx) : isSurveyOptionSelected(currentPost, qIdx, oIdx) }" @click="!hasVoted(currentPost) && selectSurveyOption(currentPost, qIdx, oIdx)">
                  <span class="survey-opt-check">
                    <i v-if="q.type === 'multiple'" :class="isSurveyOptionSelected(currentPost, qIdx, oIdx) || (hasVoted(currentPost) && Array.isArray(getUserSurveyAnswer(currentPost, qIdx)) && getUserSurveyAnswer(currentPost, qIdx).indexOf(oIdx) > -1) ? 'fa-solid fa-square-check' : 'fa-regular fa-square'"></i>
                    <i v-else :class="isSurveyOptionSelected(currentPost, qIdx, oIdx) || (hasVoted(currentPost) && getUserSurveyAnswer(currentPost, qIdx) === oIdx) ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'"></i>
                  </span>
                  <span class="survey-opt-text">{{ opt }}</span>
                </div>
              </div>
            </div>
            <div class="poll-meta">
              <span>{{ getSurveyTotal(currentPost) }} 人参与</span>
              <button v-if="isPostOwner(currentPost) && getSurveyTotal(currentPost) > 0" class="poll-view-results-btn" @click="viewResults(currentPost)"><i class="fa-solid fa-clipboard-list"></i> 查看结果</button>
            </div>
            <button v-if="!hasVoted(currentPost)" class="btn-primary poll-submit-btn" @click="submitSurveyVote(currentPost)">提交问卷</button>
          </div>
          <div v-if="currentPost.title && currentPost.type === 'forum'" class="full-detail-title">{{ currentPost.title }}</div>
          <div v-if="currentPost.type !== 'poll' && currentPost.type !== 'survey'" class="full-detail-content markdown-body" v-html="renderMarkdown(currentPost.content)"></div>
          <div v-if="getPlaylistShare(currentPost)" class="playlist-share-card" @click="openPlaylistFromPost(currentPost)">
            <div class="playlist-share-icon"><i class="fa-solid fa-music"></i></div>
            <div class="playlist-share-info">
              <div class="playlist-share-name">{{ getPlaylistShare(currentPost).playlist_name || '歌单' }}</div>
              <div class="playlist-share-meta">{{ getPlaylistShare(currentPost).song_count || 0 }} 首歌曲</div>
            </div>
            <i class="fa-solid fa-chevron-right playlist-share-arrow"></i>
          </div>
          <div class="detail-tags" v-if="currentPost.tags && currentPost.tags.length > 0">
            <span v-for="tag in currentPost.tags" :key="tag" class="tag-badge" @click="selectTag(tag)">{{ tag }}</span>
          </div>
          <div class="full-detail-actions">
            <button
              class="btn-like-lg"
              :class="{ liked: currentPost.liked }"
              @click="likePost(currentPost)"
            >
              <i :class="currentPost.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
              <span>{{ currentPost.like_count || 0 }}</span>
            </button>
            <button
              class="btn-bookmark-lg"
              :class="{ bookmarked: currentPost.bookmarked }"
              @click="toggleBookmark(currentPost)"
              title="收藏"
            >
              <i :class="currentPost.bookmarked ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'"></i>
              <span>{{ currentPost.bookmarked ? '已收藏' : '收藏' }}</span>
            </button>
            <button class="btn-forward" @click="forwardToChat(currentPost)">
              <i class="fa-solid fa-share"></i>
              <span>转发 {{ currentPost.share_count ? '(' + currentPost.share_count + ')' : '' }}</span>
            </button>
          </div>
          <div class="comments-section">
            <h3 class="section-title">评论 ({{ comments.length }})</h3>
            <div
              v-for="comment in commentTree"
              :key="comment.id"
              class="comment-item"
            >
              <UserAvatar
                :userId="comment.user_id"
                :name="comment.net_name || ''"
                :size="32"
                @click="showUserProfile(comment.user_id)"
              />
              <div class="comment-body">
                <div class="comment-meta">
                  <span class="comment-author">{{ comment.net_name || '未知用户' }}</span>
                  <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
                </div>
                <div class="comment-text markdown-body" v-html="renderMarkdown(comment.content)"></div>
                <div class="comment-actions">
                  <button class="comment-action-btn" @click="likeComment(comment)">
                    <i :class="comment.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
                    <span v-if="comment.like_count">{{ comment.like_count }}</span>
                  </button>
                  <button class="comment-action-btn" @click="replyToComment(comment)">
                    <i class="fa-solid fa-reply"></i> 回复
                  </button>
                  <button v-if="canDeleteComment(comment)" class="comment-action-btn comment-delete-btn" @click="confirmDeleteComment(comment)">
                    <i class="fa-solid fa-trash-can"></i> 删除
                  </button>
                </div>
                <div v-if="comment.replies && comment.replies.length > 0" class="comment-replies">
                  <div
                    v-for="reply in comment.replies"
                    :key="reply.id"
                    class="comment-item comment-reply"
                  >
                    <UserAvatar
                      :userId="reply.user_id"
                      :name="reply.net_name || ''"
                      :size="28"
                      @click="showUserProfile(reply.user_id)"
                    />
                    <div class="comment-body">
                      <div class="comment-meta">
                        <span class="comment-author">{{ reply.net_name || '未知用户' }}</span>
                        <span v-if="reply.parent_author" class="reply-to">@{{ reply.parent_author }}</span>
                        <span class="comment-time">{{ formatTime(reply.created_at) }}</span>
                      </div>
                      <div class="comment-text markdown-body" v-html="renderMarkdown(reply.content)"></div>
                      <div class="comment-actions">
                        <button class="comment-action-btn" @click="likeComment(reply)">
                          <i :class="reply.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
                          <span v-if="reply.like_count">{{ reply.like_count }}</span>
                        </button>
                        <button class="comment-action-btn" @click="replyToComment(reply)">
                          <i class="fa-solid fa-reply"></i> 回复
                        </button>
                        <button v-if="canDeleteComment(reply)" class="comment-action-btn comment-delete-btn" @click="confirmDeleteComment(reply)">
                          <i class="fa-solid fa-trash-can"></i> 删除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="comments.length === 0" class="empty-hint">暂无评论，来说点什么吧</div>
          </div>
        </div>
        <div class="full-detail-comment-bar">
          <div v-if="replyToUser" class="reply-indicator">
            <span>回复 @{{ replyToUser }}</span>
            <button class="reply-clear" @click="clearReplyTo"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="full-detail-input-wrap">
            <input
              class="detail-comment-input"
              v-model="commentText"
              :placeholder="replyToUser ? '回复 @' + replyToUser + '...' : '写评论...'"
              @keyup.enter="submitComment"
            />
            <button class="btn-send" @click="submitComment" :disabled="!commentText.trim()">
              <i class="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 投票/问卷结果弹窗 -->
    <div v-if="showResultsPanel" class="modal-overlay" @click.self="closeResults">
      <div class="results-modal">
        <div class="results-modal-header">
          <h3><i :class="resultsData && resultsData.type === 'poll' ? 'fa-solid fa-chart-bar' : 'fa-solid fa-clipboard-list'" :style="resultsData && resultsData.type === 'poll' ? 'color: var(--primary-color)' : 'color: var(--accent-ai)'"></i> {{ resultsData && resultsData.type === 'poll' ? '投票结果' : '问卷结果' }}</h3>
          <button class="modal-close" @click="closeResults"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="results-modal-body" v-if="resultsLoading">
          <div class="results-loading"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>
        </div>
        <div class="results-modal-body" v-else-if="resultsData">
          <div v-if="resultsData.type === 'poll'" class="results-poll">
            <div class="results-summary">
              <span class="results-total"><i class="fa-solid fa-users"></i> {{ resultsData.total_votes }} 人参与</span>
              <span v-if="resultsData.allow_multiple" class="results-multi-badge">多选</span>
              <span v-if="resultsData.has_voted" class="results-voted-badge"><i class="fa-solid fa-check-circle"></i> 已投票</span>
            </div>
            <div v-for="(item, idx) in resultsData.results" :key="idx" class="results-poll-item" :class="{ 'results-leading': item.percent === Math.max.apply(null, resultsData.results.map(function(r) { return r.percent; })) && item.percent > 0, 'results-my-vote': resultsData.user_vote && (Array.isArray(resultsData.user_vote) ? resultsData.user_vote.indexOf(item.index) > -1 : resultsData.user_vote === item.index) }">
              <div class="results-poll-bar-wrap">
                <div class="results-poll-bar" :style="{ width: item.percent + '%' }"></div>
              </div>
              <div class="results-poll-info">
                <span class="results-poll-text">{{ item.text }} <span v-if="item.percent === Math.max.apply(null, resultsData.results.map(function(r) { return r.percent; })) && item.percent > 0" class="results-leading-badge"><i class="fa-solid fa-crown"></i></span></span>
                <span class="results-poll-stats">{{ item.percent }}% · {{ item.count }}票</span>
              </div>
            </div>
          </div>
          <div v-if="resultsData.type === 'survey'" class="results-survey">
            <div class="results-summary">
              <span class="results-total"><i class="fa-solid fa-users"></i> {{ resultsData.total_votes }} 人参与</span>
              <span v-if="resultsData.has_voted" class="results-voted-badge"><i class="fa-solid fa-check-circle"></i> 已填写</span>
            </div>
            <div v-for="(q, qIdx) in resultsData.questions" :key="qIdx" class="results-survey-q">
              <div class="results-survey-q-title">{{ qIdx + 1 }}. {{ q.question }}</div>
              <div class="results-survey-q-meta">{{ q.answer_count }} 人回答 · {{ q.type === 'text' ? '文本' : (q.type === 'single' ? '单选' : '多选') }}</div>
              <div v-if="q.type !== 'text'" class="results-survey-options">
                <div v-for="(opt, oIdx) in q.options" :key="oIdx" class="results-survey-opt">
                  <div class="results-survey-opt-bar-wrap">
                    <div class="results-survey-opt-bar" :style="{ width: (q.answer_count > 0 ? Math.round((q.option_counts[oIdx] || 0) / q.answer_count * 100) : 0) + '%' }"></div>
                  </div>
                  <div class="results-survey-opt-info">
                    <span class="results-survey-opt-text">{{ opt }}</span>
                    <span class="results-survey-opt-stats">{{ q.answer_count > 0 ? Math.round((q.option_counts[oIdx] || 0) / q.answer_count * 100) : 0 }}% · {{ q.option_counts[oIdx] || 0 }}票</span>
                  </div>
                </div>
              </div>
              <div v-else class="results-survey-text-answers">
                <div class="results-survey-text-count"><i class="fa-solid fa-pen"></i> {{ q.text_answers_count }} 条文本回答</div>
                <div v-if="q.text_answers && q.text_answers.length" class="results-survey-text-list">
                  <div v-for="(ans, aIdx) in q.text_answers" :key="aIdx" class="results-survey-text-item">
                    <span class="results-survey-text-user">{{ ans.user }}</span>
                    <span class="results-survey-text-content">{{ ans.text }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 发帖弹窗 -->
    <div v-if="showPostModal" class="modal-overlay" @click.self="showPostModal = false">
      <div class="modal-box">
        <div class="modal-header">
          <h3>{{ showPostPreview ? '预览帖子' : '发布帖子' }}</h3>
          <button class="modal-close" @click="showPostModal = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body" v-if="!showPostPreview">
          <div class="form-group">
            <label class="form-label">帖子类型</label>
            <div class="type-selector">
              <button
                class="type-btn"
                :class="{ active: newPost.type === 'forum' }"
                @click="newPost.type = 'forum'"
              ><i class="fa-solid fa-comments"></i> 论坛</button>
              <button
                class="type-btn"
                :class="{ active: newPost.type === 'food' }"
                @click="newPost.type = 'food'"
              ><i class="fa-solid fa-utensils"></i> 美食</button>
              <button
                class="type-btn"
                :class="{ active: newPost.type === 'hot' }"
                @click="newPost.type = 'hot'"
              ><i class="fa-solid fa-fire"></i> 热事</button>
              <button
                class="type-btn"
                :class="{ active: newPost.type === 'poll' }"
                @click="newPost.type = 'poll'"
              ><i class="fa-solid fa-square-poll-vertical"></i> 投票</button>
              <button
                class="type-btn"
                :class="{ active: newPost.type === 'survey' }"
                @click="newPost.type = 'survey'"
              ><i class="fa-solid fa-clipboard-list"></i> 问卷</button>
            </div>
          </div>
          <div v-if="newPost.type === 'forum'" class="form-group">
            <label class="form-label">标题</label>
            <input class="form-input" v-model="newPost.title" placeholder="输入帖子标题（可选）" />
          </div>
          <div v-if="newPost.type === 'food'" class="form-group">
            <label class="form-label">菜名 <span class="required">*</span></label>
            <input class="form-input" v-model="newPost.foodForm.dish_name" placeholder="输入菜名" />
          </div>
          <div v-if="newPost.type === 'food'" class="form-group">
            <label class="form-label">食堂 <span class="required">*</span></label>
            <select class="form-select" v-model="newPost.foodForm.canteen">
              <option value="">请选择食堂</option>
              <option value="黄山大厦">黄山大厦</option>
              <option value="优芙德">优芙德</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div v-if="newPost.type === 'food'" class="form-group">
            <label class="form-label">窗口</label>
            <input class="form-input" v-model="newPost.foodForm.window" placeholder="例如：优芙德2楼1/2号窗口" />
          </div>
          <div v-if="newPost.type === 'hot'" class="form-group">
            <label class="form-label">标题 <span class="required">*</span></label>
            <input class="form-input" v-model="newPost.hotForm.title" placeholder="输入标题" />
          </div>
          <div v-if="newPost.type === 'hot'" class="form-group">
            <label class="form-label">地点</label>
            <input class="form-input" v-model="newPost.hotForm.location" placeholder="事发地点" />
          </div>
          <div v-if="newPost.type === 'poll'" class="form-group">
            <label class="form-label">投票标题 <span class="required">*</span></label>
            <input class="form-input" v-model="newPost.pollForm.title" placeholder="输入投票标题" />
          </div>
          <div v-if="newPost.type === 'poll'" class="form-group">
            <label class="form-label">投票选项 <span class="required">*</span></label>
            <div v-for="(opt, idx) in newPost.pollForm.options" :key="idx" class="poll-option-row">
              <input class="form-input" v-model="newPost.pollForm.options[idx]" :placeholder="'选项 ' + (idx + 1)" />
              <button v-if="newPost.pollForm.options.length > 2" class="poll-remove-btn" @click="newPost.pollForm.options.splice(idx, 1)"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <button v-if="newPost.pollForm.options.length < 10" class="btn-text" @click="newPost.pollForm.options.push('')"><i class="fa-solid fa-plus"></i> 添加选项</button>
            <div class="poll-settings">
              <label class="checkbox-label"><input type="checkbox" v-model="newPost.pollForm.allowMultiple" /> 允许多选</label>
              <div v-if="newPost.pollForm.allowMultiple" class="form-inline">
                <label>最多选</label>
                <input type="number" class="form-input sm" v-model.number="newPost.pollForm.maxChoices" min="1" :max="newPost.pollForm.options.length" />
                <label>项</label>
              </div>
            </div>
          </div>
          <div v-if="newPost.type === 'survey'" class="form-group">
            <label class="form-label">问卷标题 <span class="required">*</span></label>
            <input class="form-input" v-model="newPost.surveyForm.title" placeholder="输入问卷标题" />
          </div>
          <div v-if="newPost.type === 'survey'" class="form-group">
            <label class="form-label">问题列表</label>
            <div v-for="(q, qIdx) in newPost.surveyForm.questions" :key="qIdx" class="survey-question-card">
              <div class="survey-q-header">
                <span class="survey-q-num">Q{{ qIdx + 1 }}</span>
                <select class="form-select sm" v-model="q.type" style="width:auto">
                  <option value="text">文本</option>
                  <option value="single">单选</option>
                  <option value="multiple">多选</option>
                </select>
                <button v-if="newPost.surveyForm.questions.length > 1" class="poll-remove-btn" @click="newPost.surveyForm.questions.splice(qIdx, 1)"><i class="fa-solid fa-xmark"></i></button>
              </div>
              <input class="form-input" v-model="q.question" placeholder="输入问题" />
              <div v-if="q.type === 'single' || q.type === 'multiple'" class="survey-options">
                <div v-for="(opt, oIdx) in q.options" :key="oIdx" class="poll-option-row">
                  <input class="form-input" v-model="q.options[oIdx]" :placeholder="'选项 ' + (oIdx + 1)" />
                  <button v-if="q.options.length > 2" class="poll-remove-btn" @click="q.options.splice(oIdx, 1)"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <button v-if="q.options.length < 10" class="btn-text" @click="q.options.push('')"><i class="fa-solid fa-plus"></i> 添加选项</button>
              </div>
            </div>
            <button v-if="newPost.surveyForm.questions.length < 20" class="btn-text" @click="newPost.surveyForm.questions.push({ question: '', type: 'text', options: [] })"><i class="fa-solid fa-plus"></i> 添加问题</button>
          </div>
          <div v-if="newPost.type !== 'poll' && newPost.type !== 'survey'" class="form-group">
            <label class="form-label">{{ newPost.type === 'hot' ? '详情' : '内容' }} <span class="required">*</span></label>
            <div class="textarea-toolbar">
              <button class="toolbar-btn" :class="{ active: showEmojiPicker }" @click="toggleEmojiPicker" title="表情">
                <i class="fa-regular fa-face-smile"></i>
              </button>
              <div class="char-counter" :class="{ over: isContentOverLimit }">{{ contentCharCount }}/{{ maxContentLength }}</div>
            </div>
            <div v-if="showEmojiPicker" class="emoji-picker">
              <button
                v-for="emoji in emojiList"
                :key="emoji"
                class="emoji-btn"
                @click="insertEmoji(emoji)"
              >{{ emoji }}</button>
            </div>
            <textarea class="modal-textarea" v-model="newPost.content" :placeholder="newPost.type === 'hot' ? '描述详情...' : '分享你的想法...'" rows="6"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">标签</label>
            <div class="tag-input-wrap">
              <div class="tag-input-tags">
                <span v-for="tag in newPost.tags" :key="tag" class="tag-badge removable">
                  {{ tag }}
                  <i class="fa-solid fa-xmark" @click="removeTag(tag)"></i>
                </span>
              </div>
              <input
                class="tag-input"
                v-model="tagInput"
                placeholder="输入标签后按回车"
                @keyup.enter="addTag"
              />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">可见分组</label>
            <div class="group-checkboxes">
              <label v-for="group in groups" :key="group.id" class="checkbox-label">
                <input type="checkbox" :value="group.id" v-model="newPost.groupIds" />
                <span>{{ group.name }}</span>
              </label>
              <div v-if="groups.length === 0" class="empty-hint">暂无分组</div>
            </div>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="newPost.isAnonymous" />
              <span>匿名发布</span>
            </label>
          </div>
        </div>
        <!-- 预览区域 -->
        <div class="modal-body" v-if="showPostPreview">
          <div class="preview-card">
            <div class="preview-header">
              <UserAvatar
                :userId="currentUser ? currentUser.user_id : ''"
                :name="newPost.isAnonymous ? '' : (currentUser ? (currentUser.net_name || '') : '')"
                :isAnonymous="newPost.isAnonymous"
                :size="40"
              />
              <div class="preview-author-info">
                <div class="preview-author">{{ newPost.isAnonymous ? '匿名用户' : (currentUser ? (currentUser.net_name || '未知用户') : '未知用户') }}</div>
                <div class="preview-type">{{ newPost.type === 'food' ? '美食推荐' : newPost.type === 'hot' ? '热事爆料' : '论坛帖子' }}</div>
              </div>
            </div>
            <div v-if="previewTitle" class="preview-title">{{ previewTitle }}</div>
            <div class="preview-content">{{ newPost.content }}</div>
            <div v-if="newPost.tags.length > 0" class="preview-tags">
              <span v-for="tag in newPost.tags" :key="tag" class="tag-badge">{{ tag }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showPostModal = false">取消</button>
          <button class="btn-secondary" @click="togglePreview">
            <i :class="showPostPreview ? 'fa-solid fa-pen' : 'fa-solid fa-eye'"></i>
            {{ showPostPreview ? '编辑' : '预览' }}
          </button>
          <button class="btn-primary" @click="submitPost" :disabled="!canSubmitPost || isContentOverLimit">发布</button>
        </div>
      </div>
    </div>

    <!-- 美食推荐弹窗 -->
    <div v-if="showCreateFood" class="modal-overlay" @click.self="showCreateFood = false">
      <div class="modal-box">
        <div class="modal-header">
          <h3><i class="fa-solid fa-utensils" style="color:var(--accent-community);margin-right:8px"></i>推荐美食</h3>
          <button class="modal-close" @click="showCreateFood = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">菜名 <span class="required">*</span></label>
            <input class="form-input" v-model="foodForm.dish_name" placeholder="输入菜名" />
          </div>
          <div class="form-group">
            <label class="form-label">食堂 <span class="required">*</span></label>
            <select class="form-select" v-model="foodForm.canteen">
              <option value="">请选择食堂</option>
              <option value="黄山大厦">黄山大厦</option>
              <option value="优芙德">优芙德</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">窗口</label>
            <input class="form-input" v-model="foodForm.window" placeholder="例如：优芙德2楼1/2号窗口" />
          </div>
          <div class="form-group">
            <label class="form-label">推荐理由</label>
            <textarea class="modal-textarea" v-model="foodForm.reason" placeholder="为什么推荐..." rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showCreateFood = false">取消</button>
          <button class="btn-primary" @click="submitFood" :disabled="!foodForm.dish_name.trim() || !foodForm.canteen">提交</button>
        </div>
      </div>
    </div>

    <!-- 热事爆料弹窗 -->
    <div v-if="showCreateHot" class="modal-overlay" @click.self="showCreateHot = false">
      <div class="modal-box">
        <div class="modal-header">
          <h3><i class="fa-solid fa-fire" style="color:#FF3B30;margin-right:8px"></i>爆料热事</h3>
          <button class="modal-close" @click="showCreateHot = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">标题 <span class="required">*</span></label>
            <input class="form-input" v-model="hotForm.title" placeholder="输入标题" />
          </div>
          <div class="form-group">
            <label class="form-label">详情 <span class="required">*</span></label>
            <textarea class="modal-textarea" v-model="hotForm.detail" placeholder="描述详情..." rows="4"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">地点</label>
            <input class="form-input" v-model="hotForm.location" placeholder="事发地点" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showCreateHot = false">取消</button>
          <button class="btn-primary" @click="submitHot" :disabled="!hotForm.title.trim() || !hotForm.detail.trim()">提交</button>
        </div>
      </div>
    </div>

    <!-- 用户信息卡片弹窗 -->
    <div v-if="showUserCard" class="modal-overlay" @click.self="closeUserCard">
      <div class="user-card-modal">
        <button class="modal-close" @click="closeUserCard"><i class="fa-solid fa-xmark"></i></button>
        <div class="user-card">
          <div class="user-card-avatar" :style="{ background: getAvatarColor(userCardUserId) }">
            {{ (userProfile.net_name || '?').charAt(0) }}
          </div>
          <h3 class="user-card-name">{{ userProfile.net_name || '未知用户' }}</h3>
          <div v-if="userProfile.real_name" class="user-card-realname">{{ userProfile.real_name }}</div>
          <div v-if="userProfile.signature" class="user-card-signature">{{ userProfile.signature }}</div>
          <div class="user-card-stats">
            <div class="stat-block">
              <div class="stat-value">{{ userCardStats.post_count || 0 }}</div>
              <div class="stat-label">帖子</div>
            </div>
            <div class="stat-block">
              <div class="stat-value">{{ userCardStats.like_count || 0 }}</div>
              <div class="stat-label">获赞</div>
            </div>
            <div class="stat-block">
              <div class="stat-value">{{ userCardStats.comment_count || 0 }}</div>
              <div class="stat-label">评论</div>
            </div>
          </div>
          <div class="user-card-info">
            <div v-if="userProfile.birthday" class="info-row"><i class="fa-solid fa-cake-candles"></i><span>{{ userProfile.birthday }}</span></div>
            <div v-if="userProfile.wechat" class="info-row"><i class="fa-brands fa-weixin"></i><span>{{ userProfile.wechat }}</span></div>
            <div v-if="userProfile.qq" class="info-row"><i class="fa-brands fa-qq"></i><span>{{ userProfile.qq }}</span></div>
            <div v-if="userProfile.phone" class="info-row"><i class="fa-solid fa-phone"></i><span>{{ userProfile.phone }}</span></div>
            <div v-if="userProfile.address" class="info-row"><i class="fa-solid fa-location-dot"></i><span>{{ userProfile.address }}</span></div>
          </div>
          <button
            v-if="!isSelfProfile"
            class="btn-primary btn-like-user"
            :class="{ liked: userProfile.liked_by_me }"
            @click="likeUser"
          >
            <i :class="userProfile.liked_by_me ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
            {{ userProfile.liked_by_me ? '已点赞 (' + (userProfile.like_count || 0) + ')' : '点赞 (' + (userProfile.like_count || 0) + ')' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 自定义确认弹窗 -->
    <div v-if="showConfirm" class="modal-overlay" @click.self="cancelConfirm">
      <div class="confirm-box">
        <div class="confirm-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <h3 class="confirm-title">{{ confirmData.title }}</h3>
        <p class="confirm-message">{{ confirmData.message }}</p>
        <div class="confirm-actions">
          <button class="btn-secondary" @click="cancelConfirm">取消</button>
          <button class="btn-danger" @click="executeConfirm">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AppNavBar from '@/components/AppNavBar.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import LoadingSkeleton from '@/components/LoadingSkeleton.vue';
import api from '@/utils/api';
import helpers from '@/utils/helpers';
import wsManager from '@/utils/websocket';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.min.css';
import LatexRenderer from '@/utils/latex-renderer';

var TAG_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30',
  '#5AC8FA', '#FF2D55', '#5856D6', '#00C7BE', '#FF6482',
  '#8E8E93', '#636366', '#FFCC00', '#00D4FF', '#BF5AF2'
];

var customRenderer = new marked.Renderer();
customRenderer.code = function(code, lang) {
  var language = lang || '';
  var highlighted;
  if (language && hljs.getLanguage(language)) {
    try {
      highlighted = hljs.highlight(code, { language: language }).value;
    } catch (e) {
      highlighted = hljs.highlightAuto(code).value;
    }
  } else {
    highlighted = hljs.highlightAuto(code).value;
  }
  var lines = highlighted.split('\n');
  var lineNumbersHtml = '';
  var codeLinesHtml = '';
  for (var i = 0; i < lines.length; i++) {
    lineNumbersHtml += '<span class="code-line-number">' + (i + 1) + '</span>';
    codeLinesHtml += '<span class="code-line">' + lines[i] + '</span>';
  }
  var langLabel = language ? '<span class="code-lang-label">' + language + '</span>' : '';
  return '<pre class="code-block-wrapper">' + langLabel + '<div class="code-block-inner"><div class="code-line-numbers">' + lineNumbersHtml + '</div><code class="hljs code-block-content">' + codeLinesHtml + '</code></div></pre>';
};
customRenderer.table = function(header, body) {
  return '<div class="table-wrapper"><table class="md-table"><thead>' + header + '</thead><tbody>' + body + '</tbody></table></div>';
};
customRenderer.tablerow = function(content) {
  return '<tr>' + content + '</tr>';
};
customRenderer.tablecell = function(content, flags) {
  var tag = flags.header ? 'th' : 'td';
  var align = flags.align ? ' style="text-align:' + flags.align + '"' : '';
  return '<' + tag + align + '>' + content + '</' + tag + '>';
};

marked.setOptions({
  renderer: customRenderer,
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
});


export default {
  name: 'Community',
  components: { AppNavBar: AppNavBar, UserAvatar: UserAvatar, ConfirmDialog: ConfirmDialog, LoadingSkeleton: LoadingSkeleton },
  data: function() {
    return {
      tabs: [
        { key: 'forum', label: '论坛', icon: 'fa-solid fa-comments' },
        { key: 'food', label: '美食榜', icon: 'fa-solid fa-utensils' },
        { key: 'hot', label: '热事榜', icon: 'fa-solid fa-fire' },
        { key: 'mine', label: '我的', icon: 'fa-solid fa-user' }
      ],
      activeTab: 'forum',
      currentPostId: null,
      showFullDetail: false,
      commentText: '',
      replyToUser: '',
      loading: false,
      foodLoading: false,
      hotLoading: false,
      featuredLoading: false,
      featuredPosts: [],
      searchKeyword: '',
      isSearching: false,
      showPostModal: false,
      showPostPreview: false,
      showEmojiPicker: false,
      newPost: { content: '', title: '', groupIds: [], isAnonymous: false, type: 'forum', tags: [], foodForm: { dish_name: '', canteen: '', window: '' }, hotForm: { title: '', location: '' }, pollForm: { title: '', options: ['', ''], allowMultiple: false, maxChoices: 1 }, surveyForm: { title: '', questions: [{ question: '', type: 'text', options: [] }] } },
      showCreateFood: false,
      foodForm: { dish_name: '', canteen: '', window: '', reason: '' },
      showCreateHot: false,
      hotForm: { title: '', detail: '', location: '' },
      showUserCard: false,
      userProfile: {},
      userCardUserId: null,
      userCardStats: {},
      myStats: {},
      showConfirm: false,
      confirmData: { title: '', message: '', action: null },
      sortMode: 'latest',
      postsPage: 1,
      postsHasMore: true,
      postsLoadingMore: false,
      selectedTag: '',
      tagInput: '',
      bookmarkPosts: [],
      bookmarkTotal: 0,
      userLevels: {},
      pullRefreshY: 0,
      isPulling: false,
      isRefreshing: false,
      pullStartY: 0,
      maxContentLength: 0,
      pollMultiSelections: {},
      pollSingleSelections: {},
      surveyAnswers: {},
      showResultsPanel: false,
      resultsPostId: null,
      resultsData: null,
      resultsLoading: false,
      emojiList: [
        '😀','😂','🤣','😊','😍','🥰','😘','😜','🤔','😏',
        '😢','😭','😤','🤯','😱','🥳','😴','🤗','🤩','😎',
        '👍','👎','👏','🙌','🤝','💪','✌️','🤞','👋','🫶',
        '❤️','🧡','💛','💚','💙','💜','🖤','💔','💯','🔥',
        '⭐','🌟','✨','🎉','🎊','🏆','🎯','💡','📌','🔔'
      ],
    };
  },
  computed: {
    currentUser: function() {
      return this.$store.state.auth.user;
    },
    canViewAnonymous: function() {
      var user = this.$store.state.auth.user;
      if (!user) return false;
      if (user.is_admin === 1) return true;
      if (user.role === 'officer') {
        var perms = [];
        if (typeof user.officer_permissions === 'string') {
          try { perms = JSON.parse(user.officer_permissions); } catch (e) { return false; }
        } else if (Array.isArray(user.officer_permissions)) {
          perms = user.officer_permissions;
        }
        return perms.indexOf('manage_community') !== -1;
      }
      return false;
    },
    posts: function() { return this.$store.state.community.posts; },
    comments: function() { return this.$store.state.community.comments; },
    foodRanking: function() { return this.$store.state.community.foodRanking; },
    hotRanking: function() { return this.$store.state.community.hotRanking; },
    myPosts: function() { return this.$store.state.community.myPosts; },
    myPostsTotal: function() { return this.$store.state.community.myPostsTotal; },
    groups: function() { return this.$store.state.community.groups; },
    currentPost: function() { return this.$store.state.community.currentPost; },
    profile: function() { return this.$store.state.community.profile; },
    tagList: function() { return this.$store.state.community.tagList; },
    isSelfProfile: function() {
      var user = this.currentUser;
      return user && String(this.userCardUserId) === String(user.user_id);
    },
    canManageFeatured: function() {
      var user = this.currentUser;
      if (!user) return false;
      if (user.is_admin === 1) return true;
      if (user.role === 'officer') {
        var perms = [];
        if (typeof user.officer_permissions === 'string') {
          try { perms = JSON.parse(user.officer_permissions); } catch (e) { return false; }
        } else if (Array.isArray(user.officer_permissions)) {
          perms = user.officer_permissions;
        }
        return perms.indexOf('manage_community') !== -1;
      }
      return false;
    },
    bookmarks: function() { return this.$store.state.community.bookmarks; },
    bookmarkTotal: function() { return this.$store.state.community.bookmarksTotal; },
    canSubmitPost: function() {
      if (this.newPost.type === 'poll') {
        return this.newPost.pollForm.title.trim() && this.newPost.pollForm.options.filter(function(o) { return o.trim(); }).length >= 2;
      }
      if (this.newPost.type === 'survey') {
        return this.newPost.surveyForm.title.trim() && this.newPost.surveyForm.questions.filter(function(q) { return q.question.trim(); }).length >= 1;
      }
      if (!this.newPost.content.trim()) return false;
      if (this.newPost.type === 'food' && (!this.newPost.foodForm.dish_name.trim() || !this.newPost.foodForm.canteen)) return false;
      if (this.newPost.type === 'hot' && !this.newPost.hotForm.title.trim()) return false;
      return true;
    },
    displayPosts: function() {
      var list;
      if (this.sortMode === 'featured') {
        list = this.featuredPosts;
      } else if (this.isSearching) {
        list = this.$store.state.community.searchResults;
      } else {
        list = this.posts;
      }
      if (this.selectedTag) {
        var tag = this.selectedTag;
        return list.filter(function(post) {
          return post.tags && post.tags.indexOf(tag) !== -1;
        });
      }
      return list;
    },
    commentTree: function() {
      var comments = this.comments.map(function(c) { return Object.assign({}, c, { replies: [] }); });
      var map = {};
      var roots = [];
      var i, comment, parentId;
      for (i = 0; i < comments.length; i++) {
        comment = comments[i];
        map[comment.id] = comment;
      }
      for (i = 0; i < comments.length; i++) {
        comment = comments[i];
        parentId = comment.parent_id;
        if (parentId && map[parentId]) {
          comment.parent_author = map[parentId].net_name || '用户';
          map[parentId].replies.push(comment);
        } else {
          roots.push(comment);
        }
      }
      return roots;
    },
    contentCharCount: function() {
      return (this.newPost.content || '').length;
    },
    isContentOverLimit: function() {
      return this.maxContentLength > 0 && this.contentCharCount > this.maxContentLength;
    },
    previewTitle: function() {
      if (this.newPost.type === 'food') return this.newPost.foodForm.dish_name;
      if (this.newPost.type === 'hot') return this.newPost.hotForm.title;
      if (this.newPost.type === 'forum' && this.newPost.title) return this.newPost.title;
      return '';
    },
    pullRefreshStyle: function() {
      if (this.pullRefreshY > 0) {
        return { transform: 'translateY(' + Math.min(this.pullRefreshY, 80) + 'px)', transition: this.isPulling ? 'none' : 'transform 0.3s var(--ease-standard)' };
      }
      return { transform: 'translateY(0)', transition: 'transform 0.3s var(--ease-standard)' };
    }
  },
  watch: {
    activeTab: function(val) {
      if (val === 'mine') { this.loadMyData(); this.$store.dispatch('community/fetchBookmarks', { page: 1 }); }
      else if (val === 'food') { this.foodLoading = true; this.$store.dispatch('community/fetchFoodRanking').finally(function() { this.foodLoading = false; }.bind(this)); }
      else if (val === 'hot') { this.hotLoading = true; this.$store.dispatch('community/fetchHotRanking').finally(function() { this.hotLoading = false; }.bind(this)); }
    }
  },
  created: function() {
    var self = this;
    self.initData();
    self.setupWSListeners();
    var postId = self.$route.query.post;
    if (postId) {
      self.$nextTick(function() {
        self.openPost(parseInt(postId, 10));
        self.$router.replace({ query: {} }).catch(function() {});
      });
    }
    var sharePlaylist = self.$route.query.sharePlaylist;
    if (sharePlaylist) {
      try {
        var plData = JSON.parse(decodeURIComponent(sharePlaylist));
        self.$nextTick(function() {
          self.showPlaylistSharePost(plData);
          self.$router.replace({ query: {} }).catch(function() {});
        });
      } catch (e) {}
    }
  },
  beforeDestroy: function() { this.cleanupWSListeners(); },
  methods: {
    setupWSListeners: function() {
      var self = this;
      self._wsCommunityHandler = function(data) {
        if (!data || !data.action) return;
        if (data.action === 'create_post' && data.post) {
          if (self.activeTab === 'forum') {
            self.initData();
          } else if (self.activeTab === 'food') {
            self.$store.dispatch('community/fetchFoodRanking');
          } else if (self.activeTab === 'hot') {
            self.$store.dispatch('community/fetchHotRanking');
          }
        } else if (data.action === 'create_comment' && data.comment) {
          if (self.currentPost && self.currentPost.id === data.comment.post_id) {
            self.$store.dispatch('community/fetchComments', data.comment.post_id);
            self.$set(self, 'currentPost', Object.assign({}, self.currentPost, { comment_count: (self.currentPost.comment_count || 0) + 1 }));
          }
        } else if (data.action === 'create_like' && data.like) {
          if (data.like.target_type === 'post' && self.currentPost) {
            if (String(self.currentPost.id) === String(data.like.target_id)) {
              self.$set(self, 'currentPost', Object.assign({}, self.currentPost, { like_count: (self.currentPost.like_count || 0) + 1 }));
            }
          } else if (data.like.target_type === 'comment') {
            var comments = self.$store.state.community.comments;
            for (var i = 0; i < comments.length; i++) {
              if (String(comments[i].id) === String(data.like.target_id)) {
                self.$set(comments, i, Object.assign({}, comments[i], { like_count: (comments[i].like_count || 0) + 1 }));
                break;
              }
            }
          }
        } else if (data.action === 'delete_post' && data.post_id) {
          if (self.currentPost && self.currentPost.id === data.post_id) {
            self.$store.commit('community/SET_CURRENT_POST', null);
            self.currentPostId = null;
            self.showFullDetail = false;
          }
          self.initData();
        } else if (data.action === 'delete_like' && data.like) {
          if (data.like.target_type === 'post' && self.currentPost) {
            if (String(self.currentPost.id) === String(data.like.target_id)) {
              self.$set(self, 'currentPost', Object.assign({}, self.currentPost, { like_count: Math.max(0, (self.currentPost.like_count || 0) - 1) }));
            }
          }
        }
      };
      wsManager.on('community_event', self._wsCommunityHandler);
    },
    cleanupWSListeners: function() {
      if (this._wsCommunityHandler) {
        wsManager.off('community_event', this._wsCommunityHandler);
      }
    },
    loadUserLevels: function(posts) {
      var self = this;
      if (!posts || posts.length === 0) return;
      var userIds = [];
      for (var i = 0; i < posts.length; i++) {
        var uid = posts[i].user_id;
        if (uid && !posts[i].is_anonymous && userIds.indexOf(uid) === -1 && !self.userLevels[uid]) {
          userIds.push(uid);
        }
      }
      if (userIds.length === 0) return;
      api.get('/level/batch-levels', { params: { user_ids: userIds.join(',') } }).then(function(response) {
        var data = response.data && response.data.data;
        if (data) {
          for (var j = 0; j < userIds.length; j++) {
            var id = userIds[j];
            if (data[id] !== undefined) {
              self.$set(self.userLevels, id, {
                level: data[id].level || 0,
                show_level_community: !!data[id].show_level_community,
                role: data[id].role || '',
                officer_title: data[id].officer_title || ''
              });
            }
          }
        }
      }).catch(function() {
      });
    },
    initData: function() {
      var self = this;
      self.postsPage = 1;
      self.loading = true;
      self.$store.dispatch('community/fetchPosts', { page: 1, sort: self.sortMode }).then(function() {
        self.loading = false;
        self.postsHasMore = self.posts.length >= 20;
        self.loadUserLevels(self.posts);
      });
      self.$store.dispatch('community/fetchGroups');
    },
    changeSort: function(mode) {
      this.sortMode = mode;
      this.postsPage = 1;
      var self = this;
      if (mode === 'featured') {
        if (self.featuredPosts.length === 0) {
          self.loading = true;
          self.loadFeaturedPosts();
        }
      } else {
        this.loading = true;
        this.$store.dispatch('community/fetchPosts', { page: 1, sort: mode }).then(function() {
          self.loading = false;
          self.postsHasMore = self.posts.length >= 20;
          self.loadUserLevels(self.posts);
        });
      }
    },
    onPostsScroll: function(event) {
      var container = event.target;
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 100) {
        if (!this.postsLoadingMore && this.postsHasMore) {
          this.loadMorePosts();
        }
      }
    },
    loadMorePosts: function() {
      var self = this;
      if (self.postsLoadingMore || !self.postsHasMore) return;
      self.postsPage++;
      self.postsLoadingMore = true;
      self.$store.dispatch('community/fetchPostsPage', { page: self.postsPage }).then(function(result) {
        if (!result || !result.has_more) {
          self.postsHasMore = false;
        }
        self.postsLoadingMore = false;
      }).catch(function() {
        self.postsLoadingMore = false;
        self.postsHasMore = false;
      });
    },
    likeComment: function(comment) {
      var self = this;
      var wasLiked = !!comment.liked;
      var data = { target_type: 'comment', target_id: comment.id };
      if (wasLiked) { data.liked = true; }
      this.$store.dispatch('community/toggleLike', data).then(function() {
        self.$set(comment, 'liked', !wasLiked);
        self.$set(comment, 'like_count', (comment.like_count || 0) + (wasLiked ? -1 : 1));
      }).catch(function(err) {
        var msg = '操作失败';
        if (err.response && err.response.data && err.response.data.message) { msg = err.response.data.message; }
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
      });
    },
    replyToComment: function(comment) {
      this.replyToUser = comment.net_name || '用户';
      this.commentText = '@' + this.replyToUser + ' ';
      this.$nextTick(function() {
        var el = document.querySelector('.detail-comment-input');
        if (!el) el = document.querySelector('.comment-input');
        if (el) el.focus();
      });
    },
    clearReplyTo: function() {
      this.replyToUser = '';
      if (this.commentText.indexOf('@') === 0) {
        var spaceIdx = this.commentText.indexOf(' ');
        if (spaceIdx !== -1) {
          this.commentText = this.commentText.substring(spaceIdx + 1);
        }
      }
    },
    loadMyData: function() {
      var self = this;
      var userId = self.currentUser ? self.currentUser.user_id : '';
      self.$store.dispatch('community/fetchMyPosts', { page: 1 });
      self.$store.dispatch('community/fetchProfile');
      if (userId) {
        self.$store.dispatch('community/fetchUserStats', userId).then(function(stats) {
          self.myStats = stats || {};
        });
      }
    },
    switchTab: function(key) { this.activeTab = key; },
    loadFeaturedPosts: function() {
      var self = this;
      self.featuredLoading = true;
      api.get('/community/posts', { params: { type: 'forum', featured: '1', limit: 50 } }).then(function(response) {
        var data = response.data.data || {};
        var posts = data.posts || [];
        self.featuredPosts = posts;
        self.loadUserLevels(self.featuredPosts);
      }).catch(function() {
        self.featuredPosts = [];
      }).finally(function() {
        self.featuredLoading = false;
      });
    },
    toggleFeatured: function(post) {
      var self = this;
      var newFeatured = post.featured ? 0 : 1;
      api.patch('/community/posts/' + post.id + '/featured', { featured: newFeatured }).then(function(response) {
        if (response.data.code === 200) {
          self.$set(post, 'featured', newFeatured);
          self.$store.commit('toast/SHOW_TOAST', { message: newFeatured ? '已设为精选' : '已取消精选', type: 'success' });
          // 更新论坛列表中对应帖子的精选状态
          for (var i = 0; i < self.posts.length; i++) {
            if (self.posts[i].id === post.id) {
              self.$set(self.posts[i], 'featured', newFeatured);
              break;
            }
          }
          if (self.sortMode === 'featured') {
            self.loadFeaturedPosts();
          }
        }
      }).catch(function(err) {
        var msg = '操作失败';
        if (err.response && err.response.data && err.response.data.message) { msg = err.response.data.message; }
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
      });
    },
    selectPost: function(post) {
      this.currentPostId = post.id;
      this.$store.commit('community/SET_CURRENT_POST', post);
      this.$store.commit('community/SET_COMMENTS', []);
      this.$store.dispatch('community/fetchComments', post.id);
      this.showFullDetail = true;
      this.replyToUser = '';
    },
    openPost: function(postId) {
      var self = this;
      if (!postId) return;
      var found = null;
      var posts = self.$store.state.community.posts || [];
      for (var i = 0; i < posts.length; i++) {
        if (posts[i].id === postId) { found = posts[i]; break; }
      }
      if (!found) {
        var food = self.$store.state.community.foodRanking || [];
        for (var j = 0; j < food.length; j++) {
          if (food[j].id === postId) { found = food[j]; break; }
        }
      }
      if (!found) {
        var hot = self.$store.state.community.hotRanking || [];
        for (var k = 0; k < hot.length; k++) {
          if (hot[k].id === postId) { found = hot[k]; break; }
        }
      }
      if (found) {
        self.selectPost(found);
      } else {
        api.get('/community/posts/' + postId).then(function(response) {
          var post = response.data.data;
          if (post) {
            post.is_anonymous = post.anonymous;
            try { post.tags = JSON.parse(post.tags || '[]'); } catch (e) { post.tags = []; }
            self.selectPost(post);
          } else {
            self.$store.commit('toast/SHOW_TOAST', { message: '帖子不存在或已被删除', type: 'error' });
          }
        }).catch(function(err) {
          self.$store.commit('toast/SHOW_TOAST', { message: '帖子不存在或已被删除', type: 'error' });
        });
      }
    },
    selectRankingPost: function(item) {
      var post = Object.assign({}, item, { type: item.type || (item.dish_name ? 'food' : 'hot') });
      this.currentPostId = post.id;
      this.$store.commit('community/SET_CURRENT_POST', post);
      this.$store.commit('community/SET_COMMENTS', []);
      this.$store.dispatch('community/fetchComments', post.id);
      this.showFullDetail = true;
      this.replyToUser = '';
    },
    closeFullDetail: function() {
      this.showFullDetail = false;
      this.replyToUser = '';
    },
    getAvatarColor: function(userId) {
      return helpers.getAvatarColor(userId);
    },
    getAvatarText: function(post) {
      if (post.is_anonymous) return '?';
      return (post.net_name || '?').charAt(0);
    },
    isPostOwner: function(post) {
      var user = this.currentUser;
      if (!user) return false;
      if (String(post.user_id) === String(user.user_id)) return true;
      if (this.$store.getters['auth/isAdmin']) return true;
      if (this.$store.getters['auth/canManage']('manage_community')) return true;
      return false;
    },
    formatTime: function(time) {
      if (!time) return '';
      var str = String(time);
      if (str.indexOf('T') === -1) { str = str.replace(' ', 'T'); }
      if (str.indexOf('Z') === -1 && str.indexOf('+') === -1) { str = str + 'Z'; }
      var date = new Date(str);
      if (isNaN(date.getTime())) return '';
      var now = new Date();
      var diff = now - date;
      if (diff < 0) diff = 0;
      if (diff < 60000) return '刚刚';
      if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
      if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
      if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
      var m = date.getMonth() + 1;
      var d = date.getDate();
      return m + '月' + d + '日';
    },
    doSearch: function() {
      var self = this;
      var keyword = self.searchKeyword.trim();
      if (!keyword) { self.isSearching = false; return; }
      self.isSearching = true;
      self.loading = true;
      self.$store.dispatch('community/searchPosts', { q: keyword, page: 1 }).then(function() {
        self.loading = false;
      });
    },
    onSearchInput: function() {
      if (!this.searchKeyword.trim()) { this.isSearching = false; }
    },
    clearSearch: function() {
      this.searchKeyword = '';
      this.isSearching = false;
    },
    openCreatePost: function() {
      this.newPost = { content: '', title: '', groupIds: [], isAnonymous: false, type: 'forum', tags: [], foodForm: { dish_name: '', canteen: '', window: '' }, hotForm: { title: '', location: '' }, pollForm: { title: '', options: ['', ''], allowMultiple: false, maxChoices: 1 }, surveyForm: { title: '', questions: [{ question: '', type: 'text', options: [] }] } };
      this.tagInput = '';
      this.showPostModal = true;
      this.showPostPreview = false;
      this.showEmojiPicker = false;
    },
    insertEmoji: function(emoji) {
      this.newPost.content = this.newPost.content + emoji;
    },
    toggleEmojiPicker: function() {
      this.showEmojiPicker = !this.showEmojiPicker;
    },
    togglePreview: function() {
      this.showPostPreview = !this.showPostPreview;
    },
    addTag: function() {
      var tag = (this.tagInput || '').trim();
      if (!tag) return;
      if (this.newPost.tags.indexOf(tag) !== -1) {
        this.$store.commit('toast/SHOW_TOAST', { message: '标签已存在', type: 'error' });
        return;
      }
      if (this.newPost.tags.length >= 5) {
        this.$store.commit('toast/SHOW_TOAST', { message: '最多5个标签', type: 'error' });
        return;
      }
      this.newPost.tags.push(tag);
      this.tagInput = '';
    },
    removeTag: function(tag) {
      var idx = this.newPost.tags.indexOf(tag);
      if (idx !== -1) {
        this.newPost.tags.splice(idx, 1);
      }
    },
    selectTag: function(tag) {
      if (this.selectedTag === tag) {
        this.selectedTag = '';
      } else {
        this.selectedTag = tag;
      }
      if (this.activeTab !== 'forum') {
        this.activeTab = 'forum';
      }
    },
    toggleBookmark: function(post) {
      var self = this;
      this.$store.dispatch('community/toggleBookmark', post.id).then(function() {
        var msg = post.bookmarked ? '已取消收藏' : '收藏成功';
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'success' });
      }).catch(function(err) {
        var msg = '操作失败';
        if (err.response && err.response.data && err.response.data.message) { msg = err.response.data.message; }
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
      });
    },
    submitPost: function() {
      if (this.newPost.type !== 'poll' && this.newPost.type !== 'survey' && !this.newPost.content.trim()) return;
      var data = {
        content: this.newPost.content,
        visible_groups: this.newPost.groupIds,
        hidden_groups: [],
        is_anonymous: this.newPost.isAnonymous ? 1 : 0,
        type: this.newPost.type,
        tags: this.newPost.tags
      };
      if (this.newPost.type === 'food') {
        data.title = this.newPost.foodForm.dish_name;
        data.extra = {
          canteen: this.newPost.foodForm.canteen,
          window: this.newPost.foodForm.window
        };
      } else if (this.newPost.type === 'hot') {
        data.title = this.newPost.hotForm.title;
        data.extra = {
          location: this.newPost.hotForm.location
        };
      } else if (this.newPost.type === 'forum') {
        if (this.newPost.title && this.newPost.title.trim()) {
          data.title = this.newPost.title.trim();
        }
        if (this.newPostExtra) {
          data.extra = this.newPostExtra;
        }
      } else if (this.newPost.type === 'poll') {
        data.title = this.newPost.pollForm.title;
        data.content = this.newPost.pollForm.title;
        data.extra = {
          poll_options: this.newPost.pollForm.options.filter(function(o) { return o.trim(); }),
          allow_multiple: this.newPost.pollForm.allowMultiple,
          max_choices: this.newPost.pollForm.allowMultiple ? this.newPost.pollForm.maxChoices : 1,
          votes: {},
          total_votes: 0,
          option_counts: {}
        };
      } else if (this.newPost.type === 'survey') {
        data.title = this.newPost.surveyForm.title;
        data.content = this.newPost.surveyForm.title;
        data.extra = {
          questions: this.newPost.surveyForm.questions.filter(function(q) { return q.question.trim(); }).map(function(q) {
            return { question: q.question, type: q.type, options: (q.type === 'single' || q.type === 'multiple') ? q.options.filter(function(o) { return o.trim(); }) : [] };
          }),
          votes: {},
          total_votes: 0
        };
      }
      var self = this;
      this.$store.dispatch('community/createPost', data).then(function() {
        self.showPostModal = false;
        self.newPostExtra = null;
        self.$store.commit('toast/SHOW_TOAST', { message: '发布成功', type: 'success' });
        self.initData();
      }).catch(function(err) {
        var msg = '发布失败';
        if (err.response && err.response.data && err.response.data.message) { msg = err.response.data.message; }
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
      });
    },
    getPollOptions: function(post) {
      try { var extra = typeof post.extra_json === 'string' ? JSON.parse(post.extra_json) : (post.extra_json || {}); return extra.poll_options || []; } catch (e) { return []; }
    },
    hasVoted: function(post) {
      try { var extra = typeof post.extra_json === 'string' ? JSON.parse(post.extra_json) : (post.extra_json || {}); var userId = this.currentUser ? this.currentUser.user_id : ''; return !!(extra.votes && extra.votes[userId]); } catch (e) { return false; }
    },
    getUserVote: function(post) {
      try { var extra = typeof post.extra_json === 'string' ? JSON.parse(post.extra_json) : (post.extra_json || {}); var userId = this.currentUser ? this.currentUser.user_id : ''; return extra.votes && extra.votes[userId] ? extra.votes[userId] : null; } catch (e) { return null; }
    },
    getPollTotal: function(post) {
      try { var extra = typeof post.extra_json === 'string' ? JSON.parse(post.extra_json) : (post.extra_json || {}); return extra.total_votes || 0; } catch (e) { return 0; }
    },
    getPollPercent: function(post, idx) {
      try {
        var extra = typeof post.extra_json === 'string' ? JSON.parse(post.extra_json) : (post.extra_json || {});
        var total = extra.total_votes || 0;
        if (total === 0) return 0;
        var counts = extra.option_counts || {};
        var count = counts[idx] || 0;
        return Math.round(count / total * 100);
      } catch (e) { return 0; }
    },
    isPollMultiple: function(post) {
      try { var extra = typeof post.extra_json === 'string' ? JSON.parse(post.extra_json) : (post.extra_json || {}); return !!extra.allow_multiple; } catch (e) { return false; }
    },
    getPollMaxChoices: function(post) {
      try { var extra = typeof post.extra_json === 'string' ? JSON.parse(post.extra_json) : (post.extra_json || {}); return extra.max_choices || 1; } catch (e) { return 1; }
    },
    getPollSelections: function(post) {
      var key = String(post.id);
      if (!this.pollMultiSelections[key]) {
        this.$set(this.pollMultiSelections, key, []);
      }
      return this.pollMultiSelections[key];
    },
    togglePollOption: function(post, idx) {
      if (this.hasVoted(post)) return;
      var key = String(post.id);
      if (!this.pollMultiSelections[key]) {
        this.$set(this.pollMultiSelections, key, []);
      }
      var selections = this.pollMultiSelections[key];
      var pos = selections.indexOf(idx);
      if (pos > -1) {
        selections.splice(pos, 1);
      } else {
        var maxChoices = this.getPollMaxChoices(post);
        if (selections.length < maxChoices) {
          selections.push(idx);
        }
      }
    },
    submitPollVote: function(post) {
      if (this.hasVoted(post)) return;
      var key = String(post.id);
      var selections = this.pollMultiSelections[key] || [];
      if (selections.length === 0) {
        this.$store.commit('toast/SHOW_TOAST', { message: '请选择投票选项', type: 'error' });
        return;
      }
      var self = this;
      var payload = selections.length === 1 ? { option_index: selections[0] } : { option_indices: selections };
      api.post('/community/posts/' + post.id + '/vote', payload).then(function(response) {
        if (response.data.code === 200) {
          self.$set(post, 'extra_json', JSON.stringify(Object.assign({}, typeof post.extra_json === 'string' ? JSON.parse(post.extra_json) : (post.extra_json || {}), { votes: response.data.data.votes, total_votes: response.data.data.total_votes, option_counts: response.data.data.option_counts })));
          self.$delete(self.pollMultiSelections, key);
        }
      }).catch(function(err) {
        var msg = '投票失败';
        if (err.response && err.response.data && err.response.data.message) msg = err.response.data.message;
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
      });
    },
    votePoll: function(post, idx) {
      if (this.hasVoted(post)) return;
      if (this.isPollMultiple(post)) {
        this.togglePollOption(post, idx);
        return;
      }
      var key = String(post.id);
      this.$set(this.pollSingleSelections, key, idx);
    },
    submitSinglePollVote: function(post) {
      if (this.hasVoted(post)) return;
      var key = String(post.id);
      var idx = this.pollSingleSelections[key];
      if (idx === undefined || idx === null) {
        this.$store.commit('toast/SHOW_TOAST', { message: '请选择投票选项', type: 'error' });
        return;
      }
      var self = this;
      api.post('/community/posts/' + post.id + '/vote', { option_index: idx }).then(function(response) {
        if (response.data.code === 200) {
          self.$set(post, 'extra_json', JSON.stringify(Object.assign({}, typeof post.extra_json === 'string' ? JSON.parse(post.extra_json) : (post.extra_json || {}), { votes: response.data.data.votes, total_votes: response.data.data.total_votes, option_counts: response.data.data.option_counts })));
          self.$delete(self.pollSingleSelections, key);
        }
      }).catch(function(err) {
        var msg = '投票失败';
        if (err.response && err.response.data && err.response.data.message) msg = err.response.data.message;
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
      });
    },
    getSurveyQuestions: function(post) {
      try { var extra = typeof post.extra_json === 'string' ? JSON.parse(post.extra_json) : (post.extra_json || {}); return extra.questions || []; } catch (e) { return []; }
    },
    getSurveyTotal: function(post) {
      try { var extra = typeof post.extra_json === 'string' ? JSON.parse(post.extra_json) : (post.extra_json || {}); return extra.total_votes || 0; } catch (e) { return 0; }
    },
    initSurveyAnswers: function(post) {
      var key = String(post.id);
      if (this.surveyAnswers[key]) return;
      var questions = this.getSurveyQuestions(post);
      var answers = [];
      for (var i = 0; i < questions.length; i++) {
        if (questions[i].type === 'text') {
          answers.push('');
        } else {
          answers.push(questions[i].type === 'multiple' ? [] : null);
        }
      }
      this.$set(this.surveyAnswers, key, answers);
    },
    selectSurveyOption: function(post, qIdx, oIdx) {
      var key = String(post.id);
      if (!this.surveyAnswers[key]) this.initSurveyAnswers(post);
      var answers = this.surveyAnswers[key];
      var q = this.getSurveyQuestions(post)[qIdx];
      if (q.type === 'single') {
        this.$set(answers, qIdx, oIdx);
      } else if (q.type === 'multiple') {
        var current = answers[qIdx] || [];
        var idx = current.indexOf(oIdx);
        if (idx > -1) {
          current.splice(idx, 1);
        } else {
          current.push(oIdx);
        }
        this.$set(answers, qIdx, current.slice());
      }
      this.$set(this.surveyAnswers, key, answers);
    },
    updateSurveyText: function(post, qIdx, text) {
      var key = String(post.id);
      if (!this.surveyAnswers[key]) this.initSurveyAnswers(post);
      var answers = this.surveyAnswers[key];
      this.$set(answers, qIdx, text);
      this.$set(this.surveyAnswers, key, answers);
    },
    submitSurveyVote: function(post) {
      var key = String(post.id);
      var answers = this.surveyAnswers[key];
      if (!answers) {
        this.$store.commit('toast/SHOW_TOAST', { message: '请先回答问卷', type: 'error' });
        return;
      }
      var questions = this.getSurveyQuestions(post);
      var valid = true;
      for (var i = 0; i < questions.length; i++) {
        var q = questions[i];
        var a = answers[i];
        if (q.type === 'text') {
          if (!a || !a.trim()) { valid = false; break; }
        } else if (q.type === 'single') {
          if (a === null || a === undefined) { valid = false; break; }
        } else if (q.type === 'multiple') {
          if (!a || a.length === 0) { valid = false; break; }
        }
      }
      if (!valid) {
        this.$store.commit('toast/SHOW_TOAST', { message: '请回答所有问题', type: 'error' });
        return;
      }
      var self = this;
      api.post('/community/posts/' + post.id + '/vote', { answers: answers }).then(function(response) {
        if (response.data.code === 200) {
          var extra = typeof post.extra_json === 'string' ? JSON.parse(post.extra_json) : (post.extra_json || {});
          extra.votes = extra.votes || {};
          extra.votes[self.currentUser.user_id] = answers;
          extra.total_votes = response.data.data.total_votes;
          self.$set(post, 'extra_json', JSON.stringify(extra));
          self.$delete(self.surveyAnswers, key);
          self.$store.commit('toast/SHOW_TOAST', { message: '提交成功', type: 'success' });
        }
      }).catch(function(err) {
        var msg = '提交失败';
        if (err.response && err.response.data && err.response.data.message) msg = err.response.data.message;
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
      });
    },
    isSurveyOptionSelected: function(post, qIdx, oIdx) {
      var key = String(post.id);
      var answers = this.surveyAnswers[key];
      if (!answers) return false;
      var a = answers[qIdx];
      if (a === null || a === undefined) return false;
      if (Array.isArray(a)) return a.indexOf(oIdx) > -1;
      return a === oIdx;
    },
    getUserSurveyAnswer: function(post, qIdx) {
      try {
        var extra = typeof post.extra_json === 'string' ? JSON.parse(post.extra_json) : (post.extra_json || {});
        var userId = this.currentUser ? this.currentUser.user_id : '';
        var votes = extra.votes || {};
        var userAnswers = votes[userId];
        if (!userAnswers) return null;
        return userAnswers[qIdx];
      } catch (e) { return null; }
    },
    getPollVoteCount: function(post, idx) {
      try {
        var extra = typeof post.extra_json === 'string' ? JSON.parse(post.extra_json) : (post.extra_json || {});
        var counts = extra.option_counts || {};
        return counts[idx] || 0;
      } catch (e) { return 0; }
    },
    viewResults: function(post) {
      var self = this;
      self.resultsPostId = post.id;
      self.resultsData = null;
      self.showResultsPanel = true;
      self.resultsLoading = true;
      api.get('/community/posts/' + post.id + '/results').then(function(response) {
        if (response.data.code === 200) {
          self.resultsData = response.data.data;
        }
      }).catch(function(err) {
        var msg = '获取结果失败';
        if (err.response && err.response.data && err.response.data.message) msg = err.response.data.message;
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
        self.showResultsPanel = false;
      }).finally(function() {
        self.resultsLoading = false;
      });
    },
    closeResults: function() {
      this.showResultsPanel = false;
      this.resultsPostId = null;
      this.resultsData = null;
    },
    likePost: function(post) {
      var self = this;
      var wasLiked = !!post.liked;
      var data = { target_type: 'post', target_id: post.id };
      if (wasLiked) { data.liked = true; }
      this.$store.dispatch('community/toggleLike', data).then(function() {
        self.$set(post, 'liked', !wasLiked);
        self.$set(post, 'like_count', (post.like_count || 0) + (wasLiked ? -1 : 1));
      }).catch(function(err) {
        var msg = '操作失败';
        if (err.response && err.response.data && err.response.data.message) { msg = err.response.data.message; }
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
      });
    },
    forwardToChat: function(post) {
      var self = this;
      var forwardData = {
        postId: post.id,
        postType: post.type || 'forum',
        title: post.title || post.dish_name || '',
        content: (post.content || post.reason || post.detail || '').substring(0, 100),
        dish_name: post.dish_name || '',
        canteen: post.canteen || '',
        window: post.window || '',
        location: post.location || '',
        reason: post.reason || '',
        detail: post.detail || ''
      };
      this.$store.dispatch('community/incrementShareCount', post.id).then(function() {
        post.share_count = (post.share_count || 0) + 1;
      }).catch(function() {
      });
      this.$router.push('/chat?forward=' + encodeURIComponent(JSON.stringify(forwardData)));
    },
    showPlaylistSharePost: function(plData) {
      var self = this;
      self.newPost.type = 'forum';
      self.newPost.title = '🎵 分享歌单：' + (plData.playlistName || '歌单');
      self.newPost.content = '分享了一个音乐歌单「' + (plData.playlistName || '歌单') + '」，共 ' + (plData.songCount || 0) + ' 首歌曲。' + (plData.description ? '\n\n' + plData.description : '');
      self.newPostExtra = { playlist_id: plData.playlistId, playlist_name: plData.playlistName, song_count: plData.songCount };
      self.showPostModal = true;
    },
    getPlaylistShare: function(post) {
      try {
        var extra = typeof post.extra_json === 'string' ? JSON.parse(post.extra_json) : (post.extra_json || {});
        if (extra.playlist_id) return extra;
        return null;
      } catch (e) { return null; }
    },
    openPlaylistFromPost: function(post) {
      var pl = this.getPlaylistShare(post);
      if (pl && pl.playlist_id) {
        this.$router.push('/music?playlist=' + pl.playlist_id);
      }
    },
    submitComment: function() {
      if (!this.commentText.trim() || !this.currentPost) return;
      var self = this;
      var postId = this.currentPost.id;
      var content = this.commentText.trim();
      this.$store.dispatch('community/addComment', {
        postId: postId,
        content: content
      }).then(function() {
        self.commentText = '';
        self.replyToUser = '';
        self.$store.dispatch('community/fetchComments', postId);
        if (self.currentPost) {
          self.$set(self, 'currentPost', Object.assign({}, self.currentPost, { comment_count: (self.currentPost.comment_count || 0) + 1 }));
        }
      }).catch(function(err) {
        var msg = '评论失败';
        if (err.response && err.response.data && err.response.data.message) { msg = err.response.data.message; }
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
      });
    },
    likeRanking: function(type, item) {
      var self = this;
      var wasLiked = !!item.liked;
      var data = { target_type: 'post', target_id: item.id };
      if (wasLiked) { data.liked = true; }
      this.$store.dispatch('community/toggleLike', data).then(function() {
        self.$set(item, 'liked', !wasLiked);
        self.$set(item, 'like_count', (item.like_count || 0) + (wasLiked ? -1 : 1));
      }).catch(function(err) {
        var msg = '操作失败';
        if (err.response && err.response.data && err.response.data.message) { msg = err.response.data.message; }
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
      });
    },
    submitFood: function() {
      if (!this.foodForm.dish_name.trim()) return;
      var self = this;
      this.$store.dispatch('community/createFood', this.foodForm).then(function() {
        self.showCreateFood = false;
        self.foodForm = { dish_name: '', canteen: '', window: '', reason: '' };
        self.$store.dispatch('community/fetchFoodRanking');
        self.$store.commit('toast/SHOW_TOAST', { message: '推荐成功', type: 'success' });
      }).catch(function(err) {
        var msg = '推荐失败';
        if (err.response && err.response.data && err.response.data.message) { msg = err.response.data.message; }
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
      });
    },
    submitHot: function() {
      if (!this.hotForm.title.trim()) return;
      var self = this;
      this.$store.dispatch('community/createHot', this.hotForm).then(function() {
        self.showCreateHot = false;
        self.hotForm = { title: '', detail: '', location: '' };
        self.$store.dispatch('community/fetchHotRanking');
        self.$store.commit('toast/SHOW_TOAST', { message: '爆料成功', type: 'success' });
      }).catch(function(err) {
        var msg = '爆料失败';
        if (err.response && err.response.data && err.response.data.message) { msg = err.response.data.message; }
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
      });
    },
    confirmDeletePost: function(postId) {
      var self = this;
      this.confirmData = {
        title: '删除帖子',
        message: '确定要删除这篇帖子吗？删除后不可恢复。',
        action: function() {
          self.$store.dispatch('community/deletePost', postId).then(function() {
            if (self.currentPost && self.currentPost.id === postId) {
              self.$store.commit('community/SET_CURRENT_POST', null);
              self.currentPostId = null;
            }
            self.$store.commit('toast/SHOW_TOAST', { message: '已删除', type: 'success' });
            self.loadMyData();
          }).catch(function() {
            self.$store.commit('toast/SHOW_TOAST', { message: '删除失败', type: 'error' });
          });
        }
      };
      this.showConfirm = true;
    },
    executeConfirm: function() {
      if (this.confirmData.action) { this.confirmData.action(); }
      this.showConfirm = false;
    },
    cancelConfirm: function() { this.showConfirm = false; },
    showUserProfile: function(userId) {
      if (!userId) return;
      var self = this;
      this.userCardUserId = userId;
      this.$store.dispatch('community/fetchUserProfile', userId).then(function(data) {
        self.userProfile = data || {};
        self.showUserCard = true;
        self.$store.dispatch('community/fetchUserStats', userId).then(function(stats) {
          self.userCardStats = stats || {};
        });
      }).catch(function() {
        self.$store.commit('toast/SHOW_TOAST', { message: '获取用户信息失败', type: 'error' });
      });
    },
    closeUserCard: function() { this.showUserCard = false; this.userProfile = {}; },
    likeUser: function() {
      if (!this.userCardUserId) return;
      var self = this;
      var isLiked = !!this.userProfile.liked_by_me;
      var data = { target_type: 'user', target_id: this.userCardUserId };
      if (isLiked) { data.liked = true; }
      this.$store.dispatch('community/toggleLike', data).then(function() {
        self.userProfile.liked_by_me = !isLiked;
        self.userProfile.like_count = (self.userProfile.like_count || 0) + (isLiked ? -1 : 1);
        self.$store.commit('toast/SHOW_TOAST', { message: isLiked ? '已取消点赞' : '点赞成功', type: 'success' });
      }).catch(function(err) {
        var msg = '操作失败';
        if (err.response && err.response.data && err.response.data.message) { msg = err.response.data.message; }
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
      });
    },
    onPullStart: function(e) {
      var contentList = this.$el.querySelector('.content-list');
      if (!contentList || contentList.scrollTop > 0) return;
      if (e.touches && e.touches.length > 0) {
        this.pullStartY = e.touches[0].clientY;
        this.isPulling = true;
      }
    },
    onPullMove: function(e) {
      if (!this.isPulling || this.isRefreshing) return;
      if (e.touches && e.touches.length > 0) {
        var diff = e.touches[0].clientY - this.pullStartY;
        if (diff > 0) {
          this.pullRefreshY = diff * 0.4;
          e.preventDefault();
        }
      }
    },
    onPullEnd: function() {
      if (!this.isPulling) return;
      this.isPulling = false;
      if (this.pullRefreshY > 60 && !this.isRefreshing) {
        this.isRefreshing = true;
        var self = this;
        this.initData();
        setTimeout(function() {
          self.isRefreshing = false;
          self.pullRefreshY = 0;
        }, 800);
      } else {
        this.pullRefreshY = 0;
      }
    },
    renderMarkdown: function(content) {
      if (!content) return '';
      var result = LatexRenderer.processContent(content, marked);
      result.html = DOMPurify.sanitize(result.html);
      var html = LatexRenderer.renderFinalHtml(result.html, result.placeholders);
      return html;
    },
    canDeleteComment: function(comment) {
      var user = this.currentUser;
      if (!user) return false;
      if (String(comment.user_id) === String(user.user_id)) return true;
      if (user.is_admin === 1) return true;
      if (user.role === 'officer') {
        var perms = [];
        if (typeof user.officer_permissions === 'string') {
          try { perms = JSON.parse(user.officer_permissions); } catch (e) { return false; }
        } else if (Array.isArray(user.officer_permissions)) {
          perms = user.officer_permissions;
        }
        return perms.indexOf('manage_community') !== -1;
      }
      return false;
    },
    confirmDeleteComment: function(comment) {
      var self = this;
      this.confirmData = {
        title: '删除评论',
        message: '确定要删除这条评论吗？删除后不可恢复。',
        action: function() {
          api.delete('/community/comments/' + comment.id).then(function() {
            self.$store.commit('toast/SHOW_TOAST', { message: '评论已删除', type: 'success' });
            if (self.currentPost) {
              self.$store.dispatch('community/fetchComments', self.currentPost.id);
              self.$set(self, 'currentPost', Object.assign({}, self.currentPost, { comment_count: Math.max(0, (self.currentPost.comment_count || 0) - 1) }));
            }
          }).catch(function(err) {
            var msg = '删除失败';
            if (err.response && err.response.data && err.response.data.message) { msg = err.response.data.message; }
            self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
          });
        }
      };
      this.showConfirm = true;
    }
  }
};
</script>

<style scoped>
.community-page { display: flex; flex-direction: column; height: 100%; background: var(--bg-color); overflow: hidden; }
.community-body { display: flex; flex: 1; overflow: hidden; min-height: 0; }

.community-sidebar { width: 220px; flex-shrink: 0; background: var(--sidebar-bg); border-right: 0.5px solid var(--separator-color); backdrop-filter: var(--glass-blur-container); -webkit-backdrop-filter: var(--glass-blur-container); display: flex; flex-direction: column; padding: 0; overflow-y: auto; }
.sidebar-divider { height: 0.5px; background: var(--separator-color); margin: 0 12px; }
.sidebar-menu { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; }
.sidebar-menu-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: var(--radius-md); border: none; background: transparent; color: var(--text-secondary); font-size: var(--font-size-sm); cursor: pointer; transition: all 0.2s; min-height: 44px; width: 100%; text-align: left; }
.sidebar-menu-item i { font-size: var(--font-size-callout); width: 22px; text-align: center; }
.sidebar-menu-item:hover { background: var(--bg-color); color: var(--text-primary); }
.sidebar-menu-item:active { transform: scale(0.92); opacity: 0.7; }
.sidebar-menu-item.active { background: var(--primary-color); color: #fff; box-shadow: var(--shadow-sm); }

.community-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
.content-panel { display: flex; flex-direction: column; height: 100%; }
.content-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 0.5px solid var(--separator-color); flex-shrink: 0; }
.content-title { font-size: var(--font-size-subheadline); font-weight: 600; color: var(--text-primary); margin: 0; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.search-box { display: flex; align-items: center; gap: 8px; padding: 0 12px; height: 36px; border-radius: var(--radius-md); background: rgba(118, 118, 128, 0.12); border: none; transition: background 0.2s; }
.search-box:focus-within { background: rgba(118, 118, 128, 0.18); }
.search-box i { font-size: var(--font-size-sm); color: var(--text-secondary); }
.search-input { border: none; background: transparent; color: var(--text-primary); font-size: var(--font-size-sm); outline: none; width: 140px; }
.search-clear { border: none; background: transparent; color: var(--text-secondary); cursor: pointer; padding: 0; font-size: var(--font-size-caption); }
.content-list { flex: 1; overflow-y: auto; padding: 8px 12px; }

.tag-filter-bar { display: flex; gap: 6px; padding: 8px 20px; overflow-x: auto; flex-shrink: 0; border-bottom: 0.5px solid var(--separator-color); }
.tag-filter-bar::-webkit-scrollbar { height: 0; }
.tag-filter-chip { padding: 4px 14px; border-radius: var(--radius-pill); border: none; background: rgba(118, 118, 128, 0.12); color: var(--text-secondary); font-size: var(--font-size-caption); cursor: pointer; white-space: nowrap; transition: all 0.2s; min-height: 32px; display: inline-flex; align-items: center; }
.tag-filter-chip:hover { background: rgba(118, 118, 128, 0.18); color: var(--text-primary); }
.tag-filter-chip.active { background: var(--primary-color); color: #fff; }
.tag-filter-chip:active { transform: scale(0.92); opacity: 0.7; }

.list-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; min-height: 52px; border-radius: var(--radius-md); cursor: pointer; transition: background 0.15s; background: var(--card-bg); margin-bottom: 6px; }
.list-item:hover { background: var(--bg-color); }
.list-item:active { background: var(--border-color); }
.list-item.active { background: rgba(var(--primary-rgb), 0.08); border: 1px solid rgba(var(--primary-rgb), 0.2); }

.post-avatar { width: 40px; height: 40px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-callout); font-weight: 600; flex-shrink: 0; cursor: pointer; }
.post-info { flex: 1; min-width: 0; }
.post-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; flex-wrap: wrap; }
.post-author { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-primary); }
.post-time { font-size: var(--font-size-caption2); color: var(--text-secondary); }
.post-type-badge { font-size: var(--font-size-caption2); padding: 2px 7px; border-radius: var(--radius-sm); font-weight: 600; letter-spacing: 0.3px; }
.post-type-badge.food { background: rgba(var(--warning-rgb),0.12); color: var(--warning-color); }
.post-type-badge.hot { background: rgba(var(--danger-rgb),0.12); color: var(--danger-color); }
.post-type-badge.poll { background: rgba(var(--primary-rgb),0.12); color: var(--primary-color); }
.post-type-badge.survey { background: rgba(var(--accent-ai-rgb),0.12); color: var(--accent-ai); }
.post-type-badge.anon { background: rgba(158,158,158,0.12); color: var(--text-tertiary); }

.post-poll { margin: 10px 0; }
.poll-option { position: relative; padding: 10px 14px; margin-bottom: 8px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer; overflow: hidden; transition: all 0.25s var(--ease-standard); border: 2px solid var(--border-color); display: flex; align-items: center; }
.poll-option:hover:not(.voted) { border-color: var(--primary-color); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.poll-option:active:not(.voted) { transform: scale(0.92); opacity: 0.7; }
.poll-option.voted { cursor: default; }
.poll-option.selected { border-color: var(--primary-color); background: rgba(var(--primary-rgb),0.04); }
.poll-option-bar { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(var(--primary-rgb),0.08); border-radius: var(--radius-md); transition: width 0.6s cubic-bezier(0, 0, 0.2, 1); pointer-events: none; }
.poll-option-bar.bar-leading { background: rgba(var(--primary-rgb),0.15); }
.poll-option-check { position: relative; z-index: 1; margin-right: 8px; color: var(--primary-color); font-size: var(--font-size-body); flex-shrink: 0; transition: transform 0.2s; }
.poll-option-text { position: relative; z-index: 1; font-size: var(--font-size-sm); flex: 1; min-width: 0; color: var(--text-primary); }
.poll-option-pct { position: relative; z-index: 1; font-size: var(--font-size-caption); font-weight: 600; color: var(--primary-color); flex-shrink: 0; margin-left: 8px; white-space: nowrap; }
.poll-option-count { font-weight: 400; font-size: var(--font-size-caption2); opacity: 0.6; margin-left: 3px; }
.poll-meta { font-size: var(--font-size-caption2); color: var(--text-tertiary); margin-top: 8px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.poll-multi-hint { color: var(--primary-color); font-weight: 500; }
.poll-view-results-btn { background: none; border: 1px solid rgba(var(--primary-rgb),0.2); color: var(--primary-color); cursor: pointer; font-size: var(--font-size-caption2); padding: 3px 10px; border-radius: var(--radius-md); transition: all 0.2s; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; }
.poll-view-results-btn:hover { background: rgba(var(--primary-rgb),0.08); border-color: rgba(var(--primary-rgb),0.4); }
.poll-submit-btn { margin-top: 10px; padding: 10px 20px; font-size: var(--font-size-sm); border-radius: var(--radius-md); width: 100%; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; }
.poll-option.multi-selected { border-color: var(--primary-color); background: rgba(var(--primary-rgb),0.06); box-shadow: 0 0 0 1px rgba(var(--primary-rgb),0.1); }
.poll-option.single-selected { border-color: var(--primary-color); background: rgba(var(--primary-rgb),0.06); box-shadow: 0 0 0 1px rgba(var(--primary-rgb),0.1); }
.poll-option-row { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }
.poll-option-row .form-input { flex: 1; }
.poll-remove-btn { background: none; border: none; color: var(--text-tertiary); cursor: pointer; padding: 4px 8px; font-size: var(--font-size-sm); }
.poll-remove-btn:hover { color: var(--danger-color); }
.poll-settings { display: flex; align-items: center; gap: 12px; margin-top: 8px; flex-wrap: wrap; }
.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); cursor: pointer; }
.form-inline { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); }
.form-input.sm { width: 60px; padding: 4px 8px; text-align: center; }
.btn-text { background: none; border: none; color: var(--primary-color); cursor: pointer; font-size: var(--font-size-sm); padding: 4px 0; }
.btn-text:hover { text-decoration: underline; }

.post-survey { margin: 10px 0; }
.survey-q-preview { margin-bottom: 10px; padding: 12px; background: rgba(var(--accent-ai-rgb),0.06); border-radius: var(--radius-md); border: none; }
.survey-q-title { font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 6px; color: var(--text-primary); }
.survey-q-type { font-size: var(--font-size-caption2); color: var(--text-tertiary); display: flex; align-items: center; gap: 4px; }
.survey-q-type::before { content: ''; display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: var(--accent-ai); }
.survey-q-options { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
.survey-q-opt { font-size: var(--font-size-caption2); padding: 3px 10px; border-radius: var(--radius-sm); background: rgba(var(--accent-ai-rgb),0.08); color: var(--accent-ai); border: 1px solid rgba(var(--accent-ai-rgb),0.1); transition: all 0.15s; }
.survey-q-type-tag { font-size: var(--font-size-caption2); padding: 1px 6px; border-radius: var(--radius-xs); background: rgba(var(--accent-ai-rgb),0.08); color: var(--accent-ai); margin-left: 6px; vertical-align: middle; }
.survey-q-text-area { margin-top: 6px; }
.survey-text-input { width: 100%; padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-primary); font-size: var(--font-size-sm); resize: vertical; min-height: 48px; box-sizing: border-box; }
.survey-text-input:focus { outline: none; border-color: var(--accent-ai); box-shadow: 0 0 0 2px rgba(var(--accent-ai-rgb),0.1); }
.survey-voted-text { padding: 10px 12px; border-radius: var(--radius-sm); background: rgba(var(--accent-ai-rgb),0.06); font-size: var(--font-size-sm); color: var(--text-primary); border: none; }
.survey-q-options-interactive { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
.survey-opt-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer; transition: all 0.15s; font-size: var(--font-size-sm); background: var(--bg-color); }
.survey-opt-item:hover { border-color: rgba(var(--accent-ai-rgb),0.3); background: rgba(var(--accent-ai-rgb),0.04); }
.survey-opt-item.selected { border-color: var(--accent-ai); background: rgba(var(--accent-ai-rgb),0.06); box-shadow: 0 0 0 1px rgba(var(--accent-ai-rgb),0.1); }
.survey-opt-check { color: var(--accent-ai); font-size: var(--font-size-sm); flex-shrink: 0; }
.survey-opt-text { flex: 1; }

.results-modal { background: var(--card-bg); border-radius: var(--radius-lg); width: 90%; max-width: 520px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: var(--shadow-xl); animation: resultsModalIn 0.25s ease; overflow: hidden; }
@keyframes resultsModalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
.results-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 0.5px solid var(--separator-color); background: var(--bg-color); }
.results-modal-header h3 { font-size: var(--font-size-subheadline); font-weight: 700; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
.results-modal-header h3 i { font-size: var(--font-size-callout); }
.results-modal-body { padding: 22px; overflow-y: auto; flex: 1; }
.results-loading { text-align: center; padding: 50px 0; color: var(--text-tertiary); font-size: var(--font-size-sm); }
.results-loading i { margin-right: 6px; }
.results-summary { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; padding-bottom: 14px; border-bottom: 0.5px solid var(--separator-color); }
.results-total { font-size: var(--font-size-sm); color: var(--text-secondary); display: flex; align-items: center; gap: 5px; font-weight: 500; }
.results-total i { color: var(--primary-color); }
.results-multi-badge { font-size: var(--font-size-caption2); padding: 3px 10px; border-radius: var(--radius-md); background: rgba(var(--primary-rgb),0.1); color: var(--info-color); font-weight: 600; border: 1px solid rgba(var(--primary-rgb),0.15); }
.results-voted-badge { font-size: var(--font-size-caption2); padding: 3px 10px; border-radius: var(--radius-md); background: rgba(76,175,80,0.1); color: var(--success-color); font-weight: 600; display: flex; align-items: center; gap: 4px; border: 1px solid rgba(76,175,80,0.15); }
.results-poll-item { position: relative; margin-bottom: 10px; border-radius: var(--radius-md); overflow: hidden; background: var(--bg-color); border: 2px solid var(--border-color); transition: all 0.25s; }
.results-poll-item:hover { border-color: var(--primary-color); }
.results-poll-item.results-leading { border-color: rgba(var(--primary-rgb),0.25); background: rgba(var(--primary-rgb),0.02); }
.results-poll-item.results-my-vote { border-color: rgba(76,175,80,0.35); background: rgba(76,175,80,0.02); }
.results-poll-bar-wrap { height: 38px; position: relative; }
.results-poll-bar { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(var(--primary-rgb),0.08); border-radius: var(--radius-md); transition: width 0.7s cubic-bezier(0, 0, 0.2, 1); }
.results-leading .results-poll-bar { background: rgba(var(--primary-rgb),0.15); }
.results-poll-info { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; }
.results-poll-text { font-size: var(--font-size-sm); font-weight: 500; z-index: 1; }
.results-leading-badge { color: var(--warning-color); font-size: var(--font-size-caption); margin-left: 4px; }
.results-poll-stats { font-size: var(--font-size-caption); color: var(--primary-color); font-weight: 600; z-index: 1; }
.results-survey-q { margin-bottom: 18px; padding: 14px; background: rgba(var(--accent-ai-rgb),0.04); border-radius: var(--radius-md); border: none; }
.results-survey-q-title { font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 4px; color: var(--text-primary); }
.results-survey-q-meta { font-size: var(--font-size-caption2); color: var(--text-tertiary); margin-bottom: 12px; }
.results-survey-options { display: flex; flex-direction: column; gap: 7px; }
.results-survey-opt { position: relative; border-radius: var(--radius-sm); overflow: hidden; background: var(--bg-color); border: 1px solid var(--border-color); }
.results-survey-opt-bar-wrap { height: 34px; position: relative; }
.results-survey-opt-bar { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(var(--accent-ai-rgb),0.08); border-radius: var(--radius-sm); transition: width 0.7s cubic-bezier(0, 0, 0.2, 1); }
.results-survey-opt-info { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; }
.results-survey-opt-text { font-size: var(--font-size-caption); z-index: 1; }
.results-survey-opt-stats { font-size: var(--font-size-caption2); color: var(--accent-ai); font-weight: 600; z-index: 1; }
.results-survey-text-answers { padding: 4px 0; }
.results-survey-text-count { font-size: var(--font-size-caption); color: var(--text-tertiary); display: flex; align-items: center; gap: 5px; margin-bottom: 8px; }
.results-survey-text-count i { color: var(--accent-ai); }
.results-survey-text-list { display: flex; flex-direction: column; gap: 6px; }
.results-survey-text-item { padding: 8px 12px; background: rgba(var(--accent-ai-rgb),0.04); border-radius: var(--radius-sm); border: none; }
.results-survey-text-user { font-size: var(--font-size-caption2); color: var(--accent-ai); font-weight: 600; margin-right: 8px; }
.results-survey-text-content { font-size: var(--font-size-sm); color: var(--text-primary); }
.survey-question-card { padding: 12px; margin-bottom: 10px; border: none; border-radius: var(--radius-md); background: rgba(var(--accent-ai-rgb),0.04); }
.survey-q-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.survey-q-num { font-weight: 700; font-size: var(--font-size-sm); color: var(--primary-color); }
.form-select.sm { padding: 4px 8px; font-size: var(--font-size-caption); }
.remote-badge { display: inline-block; font-size: var(--font-size-caption2); font-weight: 600; color: #fff; background: var(--primary-color); border-radius: var(--radius-xs); padding: 1px 5px; margin-left: 4px; vertical-align: middle; line-height: 1.4; }
.post-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-primary); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.post-preview { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.5; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; max-width: 100%; margin-top: 3px; }
.playlist-share-card { display: flex; align-items: center; gap: 10px; margin-top: 8px; padding: 10px 14px; border-radius: var(--radius-md); background: rgba(var(--primary-rgb), 0.06); border: 0.5px solid rgba(var(--primary-rgb), 0.15); cursor: pointer; transition: background 0.15s, border-color 0.15s; }
.playlist-share-card:hover { background: rgba(var(--primary-rgb), 0.12); border-color: var(--primary-color); }
.playlist-share-icon { width: 36px; height: 36px; border-radius: var(--radius-sm); background: rgba(var(--primary-rgb), 0.15); display: flex; align-items: center; justify-content: center; color: var(--primary-color); font-size: 16px; flex-shrink: 0; }
.playlist-share-info { flex: 1; min-width: 0; }
.playlist-share-name { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.playlist-share-meta { font-size: var(--font-size-caption2); color: var(--text-tertiary); margin-top: 1px; }
.playlist-share-arrow { color: var(--text-tertiary); font-size: var(--font-size-caption); flex-shrink: 0; }
.post-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
.tag-badge { display: inline-flex; align-items: center; gap: 3px; font-size: var(--font-size-caption2); padding: 1px 8px; border-radius: var(--radius-md); background: rgba(var(--primary-rgb),0.1); color: var(--primary-color); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.tag-badge:hover { background: rgba(var(--primary-rgb),0.2); }
.tag-badge.removable { padding-right: 5px; }
.tag-badge.removable i { font-size: 9px; margin-left: 2px; opacity: 0.6; }
.tag-badge.removable i:hover { opacity: 1; }
.post-stats { display: flex; gap: 14px; margin-top: 6px; }
.stat-item { font-size: var(--font-size-caption); color: var(--text-secondary); display: flex; align-items: center; gap: 4px; transition: color 0.2s; }
.stat-item.liked { color: var(--danger-color); }

.ranking-number { width: 34px; height: 34px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-body); font-weight: 700; flex-shrink: 0; background: var(--bg-color); color: var(--text-secondary); }
.rank-1 { background: linear-gradient(135deg, #FFD700, #FFA500); color: #fff; }
.rank-2 { background: linear-gradient(135deg, #C0C0C0, #A0A0A0); color: #fff; }
.rank-3 { background: linear-gradient(135deg, #CD7F32, #A0522D); color: #fff; }
.ranking-info { flex: 1; min-width: 0; }
.ranking-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ranking-sub { font-size: var(--font-size-caption); color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ranking-meta { display: flex; gap: 10px; margin-top: 2px; flex-wrap: wrap; }
.ranking-location { font-size: var(--font-size-caption2); color: var(--text-secondary); }
.ranking-author { font-size: var(--font-size-caption2); color: var(--text-secondary); }
.ranking-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.ranking-likes { font-size: var(--font-size-caption); color: var(--text-secondary); }

.btn-delete-detail { width: 44px; height: 44px; border-radius: var(--radius-md); border: none; background: transparent; color: var(--danger-color); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: var(--font-size-sm); transition: background 0.15s; }
.btn-delete-detail:hover { background: rgba(var(--danger-rgb),0.08); }
.btn-delete-detail:active { transform: scale(0.92); opacity: 0.7; }
.detail-type-banner { padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 16px; font-size: var(--font-size-sm); font-weight: 600; display: flex; align-items: center; gap: 10px; }
.detail-type-banner.food { background: rgba(var(--warning-rgb),0.1); color: var(--warning-color); border: none; }
.detail-type-banner.hot { background: rgba(var(--danger-rgb),0.1); color: var(--danger-color); border: none; }
.detail-type-banner.poll { background: rgba(var(--primary-rgb),0.1); color: var(--primary-color); border: none; }
.detail-type-banner.survey { background: rgba(var(--accent-ai-rgb),0.1); color: var(--accent-ai); border: none; }
.detail-dish-name, .detail-hot-title { font-size: var(--font-size-body); font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.detail-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.detail-tags .tag-badge { font-size: var(--font-size-caption); padding: 2px 10px; }
.detail-actions { display: flex; gap: 8px; padding-bottom: 14px; border-bottom: 0.5px solid var(--separator-color); margin-bottom: 14px; flex-wrap: wrap; }
.btn-like-lg { display: flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: var(--radius-xl); border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-secondary); font-size: var(--font-size-sm); cursor: pointer; transition: all 0.2s; min-height: 44px; font-weight: 500; }
.btn-like-lg:hover { border-color: var(--primary-color); color: var(--primary-color); }
.btn-like-lg.liked { background: rgba(var(--danger-rgb),0.08); border-color: var(--danger-color); color: var(--danger-color); }
.btn-like-lg.liked i { animation: likeAnim 0.4s ease; }
.btn-like-lg:active { transform: scale(0.92); opacity: 0.7; }
.btn-bookmark-lg { display: flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: var(--radius-xl); border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-secondary); font-size: var(--font-size-sm); cursor: pointer; transition: all 0.2s; min-height: 44px; font-weight: 500; }
.btn-bookmark-lg:hover { border-color: var(--warning-color); color: var(--warning-color); }
.btn-bookmark-lg.bookmarked { background: rgba(var(--warning-rgb),0.08); border-color: var(--warning-color); color: var(--warning-color); }
.btn-bookmark-lg:active { transform: scale(0.92); opacity: 0.7; }
.btn-forward { display: flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: var(--radius-xl); border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-secondary); font-size: var(--font-size-sm); cursor: pointer; transition: all 0.2s; min-height: 44px; font-weight: 500; }
.btn-forward:hover { border-color: var(--primary-color); color: var(--primary-color); }
.btn-forward:active { transform: scale(0.92); opacity: 0.7; }
@keyframes likeAnim { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }

.comments-section { margin-bottom: 14px; margin-top: 20px; }
.section-title { font-size: var(--font-size-body); font-weight: 600; color: var(--text-primary); margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 0.5px solid var(--separator-color); }
.comment-item { display: flex; gap: 8px; padding: 8px 0; border-bottom: 0.5px solid var(--separator-color); }
.comment-avatar { width: 28px; height: 28px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-caption2); font-weight: 600; flex-shrink: 0; cursor: pointer; }
.comment-body { flex: 1; min-width: 0; }
.comment-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; flex-wrap: wrap; }
.comment-author { font-size: var(--font-size-caption); font-weight: 600; color: var(--text-primary); }
.reply-to { font-size: var(--font-size-caption2); color: var(--primary-color); font-weight: 500; }
.comment-time { font-size: var(--font-size-caption2); color: var(--text-secondary); }
.comment-text { font-size: var(--font-size-sm); color: var(--text-primary); line-height: 1.5; word-break: break-word; }
.comment-replies { margin-top: 6px; padding-left: 12px; border-left: 2px solid var(--border-color); }
.comment-reply { padding: 6px 0; border-bottom: none; }
.comment-input-wrap { display: flex; gap: 8px; align-items: center; padding-top: 10px; border-top: 0.5px solid var(--separator-color); }
.comment-input { flex: 1; height: 40px; padding: 0 12px; border-radius: var(--radius-pill); border: none; background: rgba(118, 118, 128, 0.12); color: var(--text-primary); font-size: var(--font-size-sm); outline: none; transition: background 0.2s; }
.comment-input:focus { background: rgba(118, 118, 128, 0.18); }
.btn-send { width: 44px; height: 44px; border-radius: 50%; border: none; background: var(--primary-color); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: var(--font-size-body); transition: opacity 0.2s; flex-shrink: 0; }
.btn-send:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-send:active:not(:disabled) { transform: scale(0.92); opacity: 0.7; }
.empty-hint { font-size: var(--font-size-caption); color: var(--text-secondary); text-align: center; padding: 14px 0; }

.profile-card { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: linear-gradient(135deg, rgba(var(--primary-rgb),0.06), rgba(var(--primary-rgb),0.02)); border-bottom: 0.5px solid var(--separator-color); }
.profile-card-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.profile-card-avatar { width: 48px; height: 48px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-headline); font-weight: 600; flex-shrink: 0; }
.profile-card-info { flex: 1; min-width: 0; }
.profile-card-name { font-size: var(--font-size-body); font-weight: 600; color: var(--text-primary); }
.profile-card-id { font-size: var(--font-size-caption); color: var(--text-secondary); margin-top: 1px; }
.profile-card-signature { font-size: var(--font-size-caption); color: var(--text-secondary); margin-top: 2px; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.profile-card-stats { display: flex; gap: 20px; flex-shrink: 0; }
.stat-block { text-align: center; }
.stat-value { font-size: var(--font-size-callout); font-weight: 700; color: var(--text-primary); }
.stat-label { font-size: var(--font-size-caption2); color: var(--text-secondary); margin-top: 1px; }

.mine-panel { display: flex; flex-direction: column; height: 100%; }
.mine-body { flex: 1; overflow-y: auto; padding: 0; }
.mine-columns { display: flex; gap: 0; flex: 1; min-height: 0; }
.mine-column { flex: 1; min-width: 0; overflow-y: auto; }
.mine-column:first-child { border-right: 0.5px solid var(--separator-color); }

.bookmarks-section { padding: 14px 16px; }
.empty-state-sm { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; color: var(--text-secondary); gap: 6px; font-size: var(--font-size-sm); }
.empty-state-sm i { font-size: var(--font-size-title1); opacity: 0.35; margin-bottom: 4px; }

.my-posts-section { padding: 14px 16px; }
.my-post-item { cursor: pointer; }
.btn-delete { width: 40px; height: 40px; border-radius: var(--radius-sm); border: none; background: transparent; color: var(--danger-color); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: var(--font-size-sm); transition: background 0.15s; flex-shrink: 0; }
.btn-delete:hover { background: rgba(var(--danger-rgb),0.08); }

.btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 20px; border-radius: var(--radius-md); border: none; background: var(--primary-color); color: #fff; font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; transition: opacity 0.2s; min-height: 44px; }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary:active:not(:disabled) { transform: scale(0.92); opacity: 0.7; }
.btn-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-primary); font-size: var(--font-size-sm); cursor: pointer; transition: background 0.15s; min-height: 44px; }
.btn-secondary:hover { background: var(--bg-color); }
.btn-secondary:active { transform: scale(0.92); opacity: 0.7; }
.btn-danger { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 20px; border-radius: var(--radius-md); border: none; background: var(--danger-color); color: #fff; font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; transition: opacity 0.2s; min-height: 44px; }
.btn-danger:hover { opacity: 0.9; }
.btn-danger:active { transform: scale(0.92); opacity: 0.7; }
.btn-like { display: flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-secondary); cursor: pointer; font-size: var(--font-size-sm); transition: all 0.2s; min-height: 44px; }
.btn-like:hover { color: var(--danger-color); border-color: var(--danger-color); }
.btn-like.liked { color: var(--danger-color); border-color: var(--danger-color); background: rgba(var(--danger-rgb),0.06); }
.btn-like:active { transform: scale(0.92); opacity: 0.7; }
.like-count { font-size: var(--font-size-caption); }
.btn-forward-sm { width: 44px; height: 44px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: var(--font-size-sm); transition: all 0.2s; }
.btn-forward-sm:hover { color: var(--primary-color); border-color: var(--primary-color); }
.btn-forward-sm:active { transform: scale(0.92); opacity: 0.7; }
.btn-create { font-size: var(--font-size-caption); padding: 6px 14px; }

.sort-options { display: flex; gap: 2px; border-radius: var(--radius-sm); overflow: hidden; background: rgba(118, 118, 128, 0.12); padding: 2px; border: none; }
.sort-btn { padding: 7px 14px; border: none; background: transparent; color: var(--text-secondary); font-size: var(--font-size-sm); cursor: pointer; transition: all 0.2s; font-weight: 400; min-height: 40px; border-radius: var(--radius-xs); }
.sort-btn.active { background: var(--card-bg); color: var(--text-primary); font-weight: 500; box-shadow: var(--shadow-sm); }
.sort-btn:hover:not(.active) { color: var(--text-primary); }
.sort-btn:active { transform: scale(0.92); opacity: 0.7; }

.comment-actions { display: flex; gap: 12px; margin-top: 4px; }
.comment-action-btn { border: none; background: transparent; color: var(--text-secondary); font-size: var(--font-size-caption2); cursor: pointer; display: flex; align-items: center; gap: 3px; padding: 2px 0; transition: color 0.15s; }
.comment-action-btn:hover { color: var(--primary-color); }
.comment-action-btn .fa-solid.fa-heart { color: var(--danger-color); }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); backdrop-filter: var(--glass-blur-thin); -webkit-backdrop-filter: var(--glass-blur-thin); display: flex; align-items: center; justify-content: center; z-index: var(--z-modal, 10001); }
.modal-box { width: 70%; max-width: 640px; min-width: 380px; background: var(--card-bg); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-lg); max-height: 85vh; display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 0.5px solid var(--separator-color); flex-shrink: 0; }
.modal-header h3 { font-size: var(--font-size-callout); font-weight: 600; color: var(--text-primary); margin: 0; }
.modal-close { width: 44px; height: 44px; border-radius: 50%; border: none; background: transparent; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: var(--font-size-callout); transition: background 0.15s; }
.modal-close:hover { background: var(--bg-color); }
.modal-close:active { transform: scale(0.92); opacity: 0.7; }
.modal-body { padding: 18px; overflow-y: auto; flex: 1; }
.modal-textarea { width: 100%; padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-primary); font-size: var(--font-size-sm); outline: none; resize: vertical; font-family: inherit; transition: border-color 0.2s; box-sizing: border-box; }
.modal-textarea:focus { border-color: var(--primary-color); }
.char-count { text-align: right; font-size: var(--font-size-caption2); color: var(--text-secondary); margin-top: 4px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 18px; border-top: 0.5px solid var(--separator-color); flex-shrink: 0; }

.type-selector { display: flex; gap: 8px; }
.type-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-secondary); font-size: var(--font-size-sm); cursor: pointer; transition: all 0.2s; min-height: 44px; }
.type-btn:hover { border-color: var(--primary-color); color: var(--primary-color); }
.type-btn.active { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
.type-btn:active { transform: scale(0.92); opacity: 0.7; }
.type-btn i { font-size: var(--font-size-sm); }

.tag-input-wrap { display: flex; flex-direction: column; gap: 6px; }
.tag-input-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.tag-input { width: 100%; height: 36px; padding: 0 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-primary); font-size: var(--font-size-sm); outline: none; transition: border-color 0.2s; box-sizing: border-box; }
.tag-input:focus { border-color: var(--primary-color); }

.form-group { margin-bottom: 14px; }
.form-label { display: block; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.required { color: var(--danger-color); }
.form-input { width: 100%; height: 42px; padding: 0 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-primary); font-size: var(--font-size-sm); outline: none; transition: border-color 0.2s; box-sizing: border-box; }
.form-input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.08); }
.form-select { width: 100%; height: 42px; padding: 0 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-primary); font-size: var(--font-size-sm); outline: none; transition: border-color 0.2s; box-sizing: border-box; appearance: auto; }
.form-select:focus { border-color: var(--primary-color); }
.group-checkboxes { display: flex; flex-wrap: wrap; gap: 10px; }
.checkbox-label { display: flex; align-items: center; gap: 5px; font-size: var(--font-size-sm); color: var(--text-primary); cursor: pointer; }
.checkbox-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--primary-color); }

.confirm-box { width: 340px; background: var(--card-bg); border-radius: var(--radius-lg); padding: 24px; text-align: center; box-shadow: var(--shadow-lg); }
.confirm-icon { font-size: 36px; color: var(--warning-color); margin-bottom: 14px; }
.confirm-title { font-size: var(--font-size-callout); font-weight: 600; color: var(--text-primary); margin: 0 0 6px 0; }
.confirm-message { font-size: var(--font-size-sm); color: var(--text-secondary); margin: 0 0 20px 0; line-height: 1.5; }
.confirm-actions { display: flex; justify-content: center; gap: 10px; }

.user-card-modal { width: 340px; background: var(--card-bg); border-radius: var(--radius-lg); padding: 24px; position: relative; box-shadow: var(--shadow-lg); }
.user-card-modal .modal-close { position: absolute; top: 10px; right: 10px; }
.user-card { display: flex; flex-direction: column; align-items: center; }
.user-card-avatar { width: 56px; height: 56px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 600; margin-bottom: 10px; }
.user-card-name { font-size: var(--font-size-subheadline); font-weight: 600; color: var(--text-primary); margin: 0 0 2px 0; }
.user-card-realname { font-size: var(--font-size-caption); color: var(--text-secondary); margin-bottom: 4px; }
.user-card-signature { font-size: var(--font-size-caption); color: var(--text-secondary); margin-bottom: 12px; text-align: center; max-width: 260px; }
.user-card-stats { display: flex; gap: 20px; margin-bottom: 14px; }
.user-card-info { width: 100%; margin-bottom: 16px; }
.info-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: var(--font-size-sm); color: var(--text-primary); }
.info-row i { color: var(--primary-color); width: 18px; text-align: center; }
.btn-like-user { width: 100%; }
.btn-like-user.liked { background: rgba(var(--danger-rgb),0.08); border: 1px solid var(--danger-color); color: var(--danger-color); }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--text-secondary); gap: 8px; }
.empty-illustration { width: 88px; height: 88px; border-radius: 50%; background: var(--bg-color); display: flex; align-items: center; justify-content: center; margin-bottom: 12px; border: 1px solid var(--border-color); }
.empty-illustration i { font-size: 36px; opacity: 0.35; }
.empty-title { font-size: var(--font-size-callout); font-weight: 600; color: var(--text-primary); margin: 0; }
.empty-desc { font-size: var(--font-size-sm); color: var(--text-secondary); margin: 0 0 16px 0; text-align: center; line-height: 1.5; }
.empty-state .btn-primary { font-size: var(--font-size-sm); padding: 8px 20px; }
.loading-state { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 20px; color: var(--text-secondary); font-size: var(--font-size-sm); }
.nav-action-btn { width: 44px; height: 44px; border-radius: var(--radius-md); border: none; background: transparent; color: var(--primary-color); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: var(--font-size-body); transition: background 0.15s; }
.nav-action-btn:hover { background: var(--primary-light); }
.nav-action-btn:active { transform: scale(0.92); opacity: 0.7; }

.scrollbar-thin::-webkit-scrollbar { width: 5px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: var(--radius-xs); }
.scrollbar-thin::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }

/* 全屏帖子详情 */
.full-detail-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: var(--bg-color); z-index: var(--z-overlay, 10000); display: flex; flex-direction: column; }
.full-detail-header { display: flex; align-items: center; padding: 12px 20px; border-bottom: 0.5px solid var(--separator-color); background: var(--card-bg); flex-shrink: 0; gap: 12px; min-height: 56px; }
.full-detail-back { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--radius-md); border: none; background: transparent; color: var(--primary-color); font-size: var(--font-size-sm); cursor: pointer; transition: background 0.15s; font-weight: 500; min-height: 44px; }
.full-detail-back:hover { background: rgba(var(--primary-rgb), 0.08); }
.full-detail-back:active { transform: scale(0.92); opacity: 0.7; }
.full-detail-back i { font-size: var(--font-size-sm); }
.full-detail-header-title { flex: 1; min-width: 0; font-size: var(--font-size-callout); font-weight: 600; color: var(--text-primary); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.full-detail-body { flex: 1; overflow-y: auto; padding: 24px 32px; max-width: 900px; margin: 0 auto; width: 100%; }
.full-detail-author { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 0.5px solid var(--separator-color); }
.full-detail-author-info { flex: 1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.full-detail-author-name { font-size: var(--font-size-callout); font-weight: 600; color: var(--text-primary); }
.full-detail-author-time { font-size: var(--font-size-caption); color: var(--text-secondary); }
.full-detail-title { font-size: var(--font-size-title2); font-weight: 700; color: var(--text-primary); line-height: 1.4; margin-bottom: 16px; word-break: break-word; }
.full-detail-content { font-size: var(--font-size-callout); line-height: 1.8; color: var(--text-primary); margin-bottom: 16px; word-break: break-word; }
.full-detail-actions { display: flex; gap: 10px; padding: 16px 0; border-top: 0.5px solid var(--separator-color); border-bottom: 0.5px solid var(--separator-color); margin-bottom: 20px; flex-wrap: wrap; }
.full-detail-comment-bar { padding: 10px 20px; border-top: 0.5px solid var(--separator-color); background: var(--card-bg); flex-shrink: 0; }
.reply-indicator { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: rgba(var(--primary-rgb),0.06); border-radius: var(--radius-sm) var(--radius-sm) 0 0; font-size: var(--font-size-caption); color: var(--primary-color); }
.reply-clear { border: none; background: transparent; color: var(--text-secondary); cursor: pointer; padding: 2px; font-size: var(--font-size-caption); }
.reply-clear:hover { color: var(--text-primary); }
.full-detail-input-wrap { display: flex; gap: 8px; align-items: center; }
.detail-comment-input { flex: 1; height: 46px; padding: 0 16px; border-radius: var(--radius-xl); border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-primary); font-size: var(--font-size-sm); outline: none; transition: border-color 0.2s; }
.detail-comment-input:focus { border-color: var(--primary-color); }

/* 全屏详情滑入动画 */
.detail-slide-enter-active, .detail-slide-leave-active { transition: transform 0.35s cubic-bezier(0, 0, 0.2, 1); }
.detail-slide-enter, .detail-slide-leave-to { transform: translateX(100%); }
.detail-slide-enter-to, .detail-slide-leave { transform: translateX(0); }

/* 骨架屏 */
.skeleton-list { padding: 4px 0; }
.skeleton-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 6px; border-radius: var(--radius-md); background: var(--card-bg); }
.skeleton-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(90deg, var(--bg-color) 25%, var(--border-color) 50%, var(--bg-color) 75%); background-size: 200% 100%; animation: skeletonShimmer 1.5s infinite; flex-shrink: 0; }
.skeleton-lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.skeleton-line { height: 12px; border-radius: var(--radius-sm); background: linear-gradient(90deg, var(--bg-color) 25%, var(--border-color) 50%, var(--bg-color) 75%); background-size: 200% 100%; animation: skeletonShimmer 1.5s infinite; }
@keyframes skeletonShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* 下拉刷新 */
.pull-refresh-indicator { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; font-size: var(--font-size-caption); color: var(--text-secondary); transition: opacity 0.2s; }

/* 表情选择器 */
.textarea-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.toolbar-btn { width: 44px; height: 44px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: var(--font-size-callout); transition: all 0.2s; }
.toolbar-btn:hover { border-color: var(--primary-color); color: var(--primary-color); }
.toolbar-btn.active { background: rgba(var(--primary-rgb), 0.08); border-color: var(--primary-color); color: var(--primary-color); }
.toolbar-btn:active { transform: scale(0.92); opacity: 0.7; }
.char-counter { font-size: var(--font-size-caption); color: var(--text-secondary); }
.char-counter.over { color: var(--danger-color); font-weight: 600; }
.emoji-picker { display: flex; flex-wrap: wrap; gap: 2px; padding: 8px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--card-bg); margin-bottom: 8px; max-height: 160px; overflow-y: auto; }
.emoji-btn { width: 44px; height: 44px; border: none; background: transparent; font-size: var(--font-size-subheadline); cursor: pointer; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
.emoji-btn:hover { background: var(--bg-color); }
.emoji-btn:active { transform: scale(0.92); opacity: 0.7; }

/* 预览卡片 */
.preview-card { padding: 16px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--card-bg); }
.preview-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.preview-author-info { flex: 1; }
.preview-author { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-primary); }
.preview-type { font-size: var(--font-size-caption2); color: var(--text-secondary); margin-top: 1px; }
.preview-title { font-size: var(--font-size-subheadline); font-weight: 700; color: var(--text-primary); margin-bottom: 10px; }
.preview-content { font-size: var(--font-size-sm); line-height: 1.7; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; margin-bottom: 10px; }
.preview-tags { display: flex; gap: 6px; flex-wrap: wrap; }

/* Tab 切换动画 */
.content-panel { animation: tabFadeIn 0.25s ease; }
@keyframes tabFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

/* 等级图标 */
.admin-anonymous-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--radius-xs);
  font-size: var(--font-size-caption2);
  background: rgba(var(--warning-rgb), 0.15);
  color: var(--warning-color);
  margin-left: 4px;
  vertical-align: middle;
}



.admin-badge-sm {
  display: inline-block;
  background: var(--danger-color);
  color: #fff;
  font-size: var(--font-size-caption2);
  padding: 1px 6px;
  border-radius: var(--radius-xs);
  margin-left: 4px;
  vertical-align: middle;
  font-weight: 600;
  line-height: 16px;
}
.level-icon { vertical-align: middle; }
.level-icon-sm { height: 16px; width: auto; }

.loading-more-indicator {
  display: flex;
  justify-content: center;
  padding: 16px;
}
.spinner-small {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s var(--ease-standard) infinite;
}
.no-more-posts {
  text-align: center;
  padding: 16px;
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

@media (max-width: 1024px) {
  .community-sidebar { width: 170px; }
  .modal-box { width: 75%; }
}
@media (min-width: 1024px) and (orientation: landscape) {
  .community-sidebar { width: 200px; }
  .sidebar-menu { padding: 6px 10px; gap: 2px; }
  .sidebar-menu-item { padding: 10px 12px; gap: 10px; font-size: var(--font-size-sm); min-height: 42px; border-radius: var(--radius-md); }
  .sidebar-menu-item i { font-size: var(--font-size-body); width: 20px; }
  .content-header { padding: 12px 18px; }
  .content-list { padding: 8px 12px; }
  .list-item { padding: 12px 14px; min-height: 50px; margin-bottom: 6px; border-radius: var(--radius-md); }
  .post-preview { font-size: var(--font-size-caption); -webkit-line-clamp: 2; }
  .tag-filter-bar { padding: 6px 18px; }
  .full-detail-body { max-width: 900px; padding: 24px 32px; }
  .full-detail-author { gap: 14px; }
  .full-detail-title { font-size: var(--font-size-headline); }
  .full-detail-content { font-size: var(--font-size-body); }
  .comments-section { margin-top: 16px; }
  .comment-item { padding: 10px 0; }
}
@media (max-width: 768px) {
  .community-sidebar { width: 56px; }
  .sidebar-menu-item span { display: none; }
  .sidebar-menu-item { justify-content: center; padding: 12px 6px; }
  .sidebar-menu-item i { margin: 0; }
  .modal-box { width: 85%; min-width: 280px; }
  .search-box { display: none; }
  .tag-filter-bar { padding: 8px 12px; }
  .full-detail-body { padding: 16px; max-width: 100%; }
  .full-detail-title { font-size: var(--font-size-subheadline); }
  .full-detail-content { font-size: var(--font-size-body); }
}

.featured-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--font-size-caption2);
  padding: 2px 8px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, rgba(var(--warning-rgb),0.12), rgba(255,193,7,0.12));
  color: var(--warning-color);
  font-weight: 600;
  margin-top: 2px;
}

.btn-featured-toggle {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: var(--font-size-body);
  transition: all 0.2s;
}
.btn-featured-toggle:hover { border-color: var(--warning-color); color: var(--warning-color); }
.btn-featured-toggle.featured { color: var(--warning-color); border-color: var(--warning-color); background: rgba(var(--warning-rgb),0.08); }
.btn-featured-toggle:active { transform: scale(0.92); opacity: 0.7; }

.comment-delete-btn { color: var(--text-tertiary); }
.comment-delete-btn:hover { color: var(--danger-color) !important; }

.post-preview.markdown-body { white-space: normal; overflow: visible; text-overflow: unset; max-height: 80px; overflow: hidden; }
.post-preview.markdown-body >>> p { margin: 4px 0; font-size: var(--font-size-sm); }
.post-preview.markdown-body >>> code:not(.hljs) { font-size: var(--font-size-caption); }
.post-preview.markdown-body >>> pre { display: none; }
.post-preview.markdown-body >>> h1, .post-preview.markdown-body >>> h2, .post-preview.markdown-body >>> h3 { font-size: var(--font-size-sm); margin: 2px 0; }

.comment-text.markdown-body { font-size: var(--font-size-sm); line-height: 1.5; word-break: break-word; }
.comment-text.markdown-body >>> p { margin: 4px 0; }
.comment-text.markdown-body >>> code:not(.hljs) { font-size: var(--font-size-caption); padding: 1px 4px; }
.comment-text.markdown-body >>> pre.code-block-wrapper { font-size: var(--font-size-caption); margin: 6px 0; }
.comment-text.markdown-body >>> blockquote { margin: 4px 0; padding-left: 8px; }

.markdown-body >>> pre.code-block-wrapper {
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: var(--radius-md);
  overflow: hidden;
  margin: 8px 0;
  font-size: var(--font-size-sm);
  position: relative;
}
.markdown-body >>> .code-lang-label {
  display: block;
  padding: 6px 14px;
  font-size: var(--font-size-caption2);
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
  -webkit-user-select: none;
  user-select: none;
}
.markdown-body >>> .code-block-inner {
  display: flex;
  overflow-x: auto;
  padding: 0;
}
.markdown-body >>> .code-line-numbers {
  display: flex;
  flex-direction: column;
  padding: 14px 0;
  min-width: 40px;
  text-align: right;
  -webkit-user-select: none;
  user-select: none;
  background: rgba(255, 255, 255, 0.03);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}
.markdown-body >>> .code-line-number {
  display: block;
  padding: 0 10px;
  font-size: var(--font-size-caption);
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.3);
  font-family: 'Menlo', 'Consolas', monospace;
}
.markdown-body >>> .code-block-content {
  flex: 1;
  padding: 14px;
  min-width: 0;
}
.markdown-body >>> .code-block-content .code-line {
  display: block;
  line-height: 1.6;
  white-space: pre;
}
.markdown-body >>> code {
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: var(--font-size-sm);
}
.markdown-body >>> p {
  margin: 8px 0;
}
.markdown-body >>> ul,
.markdown-body >>> ol {
  padding-left: 20px;
  margin: 8px 0;
}
.markdown-body >>> blockquote {
  border-left: 3px solid var(--primary-color);
  padding-left: 12px;
  margin: 8px 0;
  color: var(--text-secondary);
}
.markdown-body >>> .table-wrapper {
  overflow-x: auto;
  margin: 8px 0;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}
.markdown-body >>> table.md-table {
  border-collapse: collapse;
  width: 100%;
  font-size: var(--font-size-sm);
}
.markdown-body >>> table.md-table th {
  background: var(--bg-color);
  font-weight: 600;
  color: var(--text-primary);
  padding: 10px 14px;
  text-align: left;
  border: 1px solid var(--border-color);
}
.markdown-body >>> table.md-table td {
  padding: 8px 14px;
  text-align: left;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}
.markdown-body >>> table.md-table tr:hover td {
  background: rgba(0, 122, 255, 0.03);
}
.markdown-body >>> .katex {
  font-size: 1.1em;
}
.markdown-body >>> .katex-display-wrapper {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 8px 0;
  text-align: center;
}
.markdown-body >>> .katex-display {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 8px 0;
  margin: 4px 0;
}
.markdown-body >>> .katex-html {
  max-width: 100%;
  overflow-x: auto;
}

/* LaTeX 文档样式 */
.markdown-body >>> .latex-document {
  line-height: 1.6;
  padding: 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  margin: 8px 0;
}
.markdown-body >>> .latex-tt {
  font-family: 'Menlo', 'Consolas', 'Courier New', monospace;
  background: rgba(127, 127, 127, 0.1);
  padding: 1px 4px;
  border-radius: var(--radius-xs);
}
.markdown-body >>> .latex-pagebreak {
  border: none;
  border-top: 1px dashed var(--border-color);
  margin: 16px 0;
}
.markdown-body >>> .latex-block-wrapper {
  margin: 8px 0;
}
.markdown-body >>> .latex-colorbox {
  display: inline-block;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  line-height: 1.5;
}
.markdown-body >>> .latex-fbox {
  display: inline-block;
  border: 1px solid currentColor;
  padding: 4px 8px;
}
.markdown-body >>> .latex-parbox {
  display: block;
}
.markdown-body >>> .latex-list {
  padding-left: 2em;
  margin: 4px 0;
}
.markdown-body >>> .latex-list li {
  margin: 2px 0;
}
.markdown-body >>> .latex-quote {
  margin: 8px 0;
  padding: 8px 16px;
  border-left: 3px solid var(--border-color);
  font-style: italic;
  opacity: 0.9;
}
.markdown-body >>> .latex-verbatim {
  background: rgba(127, 127, 127, 0.08);
  padding: 8px 12px;
  border-radius: var(--radius-xs);
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: var(--font-size-sm);
  white-space: pre-wrap;
}
.markdown-body >>> .latex-abstract {
  margin: 8px 0;
  padding: 8px 12px;
  font-size: 0.95em;
  opacity: 0.85;
}
.markdown-body >>> .latex-verse {
  margin: 8px 0;
  padding-left: 2em;
  white-space: pre-line;
}
/* LaTeX 字体大小 */
.markdown-body >>> .latex-tiny        { font-size: 0.5em; }
.markdown-body >>> .latex-footnotesize { font-size: 0.7em; }
.markdown-body >>> .latex-small       { font-size: 0.85em; }
.markdown-body >>> .latex-normalsize  { font-size: 1em; }
.markdown-body >>> .latex-large       { font-size: 1.2em; }
.markdown-body >>> .latex-Large       { font-size: 1.44em; }
.markdown-body >>> .latex-LARGE       { font-size: 1.73em; }
.markdown-body >>> .latex-huge        { font-size: 2.07em; }
.markdown-body >>> .latex-Huge        { font-size: 2.5em; }

.markdown-body >>> .latex-error {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.1);
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  font-size: var(--font-size-sm);
  font-family: 'Menlo', 'Consolas', monospace;
}
.markdown-body >>> h1 {
  font-size: 1.6em;
  font-weight: 700;
  margin: 16px 0 8px;
  padding-bottom: 6px;
  border-bottom: 0.5px solid var(--separator-color);
}
.markdown-body >>> h2 {
  font-size: 1.4em;
  font-weight: 600;
  margin: 14px 0 6px;
  padding-bottom: 4px;
  border-bottom: 0.5px solid var(--separator-color);
}
.markdown-body >>> h3 {
  font-size: 1.2em;
  font-weight: 600;
  margin: 12px 0 4px;
}
.markdown-body >>> h4 {
  font-size: 1.05em;
  font-weight: 600;
  margin: 10px 0 4px;
}
.markdown-body >>> h5,
.markdown-body >>> h6 {
  font-size: 1em;
  font-weight: 600;
  margin: 8px 0 4px;
  color: var(--text-secondary);
}
.markdown-body >>> strong {
  font-weight: 700;
  color: var(--text-primary);
}
.markdown-body >>> em {
  font-style: italic;
}
.markdown-body >>> del {
  text-decoration: line-through;
  color: var(--text-secondary);
}
.markdown-body >>> hr {
  border: none;
  border-top: 0.5px solid var(--separator-color);
  margin: 16px 0;
}
.markdown-body >>> a {
  color: var(--primary-color);
  text-decoration: none;
}
.markdown-body >>> a:hover {
  text-decoration: underline;
}
.markdown-body >>> img {
  max-width: 100%;
  border-radius: var(--radius-sm);
  margin: 8px 0;
}
.markdown-body >>> code:not(.hljs) {
  background: rgba(0, 122, 255, 0.08);
  color: var(--primary-color);
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 0.9em;
}
.markdown-body >>> input[type="checkbox"] {
  margin-right: 6px;
}
.markdown-body >>> .task-list-item {
  list-style: none;
  margin-left: -20px;
}
</style>
