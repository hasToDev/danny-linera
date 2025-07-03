use crate::LeaderboardEntry;
use linera_sdk::linera_base_types::ChainId;
use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};

#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = "ViewStorageContext")]
pub struct DannyGameState {
    pub value: RegisterView<u64>,
    pub best: RegisterView<u64>,

    // Нові поля для лідерборду
    pub player_name: RegisterView<String>,
    pub player_scores: MapView<String, LeaderboardEntry>, // Для ланцюжка лідерборду: всі результати гравців
    pub top_leaderboard: RegisterView<Vec<LeaderboardEntry>>, // Топ-10 кешований лідерборд
    pub is_leaderboard_chain: RegisterView<bool>, // Флаг для визначення чи це ланцюжок лідерборду
    pub leaderboard_chain_id: RegisterView<Option<ChainId>>, // Зберігає ID ланцюжка лідерборду
} 