use danny_game::LeaderboardEntry;
use linera_sdk::{
    linera_base_types::ChainId,
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};

#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = "ViewStorageContext")]
pub struct DannyGameState {
    pub value: RegisterView<u64>,
    pub best: RegisterView<u64>,
    pub player_name: RegisterView<String>,
    
    // Для центрального лідерборду
    pub leaderboard: MapView<String, LeaderboardEntry>, // Всі гравці по іменах
    pub top_leaderboard: RegisterView<Vec<LeaderboardEntry>>, // Топ-10 для швидкого доступу
    
    // Конфігурація
    pub leaderboard_chain_id: RegisterView<Option<ChainId>>,
    pub is_leaderboard_chain: RegisterView<bool>,
} 