#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Schema};
use linera_sdk::{
    graphql::GraphQLMutationRoot, linera_base_types::WithServiceAbi, views::View, Service,
    ServiceRuntime,
};

use danny_game::{ApplicationParameters, LeaderboardEntry, Operation};

use self::state::DannyGameState;

pub struct DannyGameService {
    state: DannyGameState,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(DannyGameService);

impl WithServiceAbi for DannyGameService {
    type Abi = danny_game::DannyGameAbi;
}

impl Service for DannyGameService {
    type Parameters = ApplicationParameters;

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = DannyGameState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        DannyGameService {
            state,
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        let value = *self.state.value.get();
        let best = *self.state.best.get();
        let player_name = self.state.player_name.get().clone();
        let is_leaderboard = *self.state.is_leaderboard_chain.get();
        let leaderboard = self.state.top_leaderboard.get().clone();

        Schema::build(
            QueryRoot {
                value,
                best,
                player_name,
                is_leaderboard,
                leaderboard,
            },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish()
        .execute(query)
        .await
    }
}

struct QueryRoot {
    value: u64,
    best: u64,
    player_name: String,
    is_leaderboard: bool,
    leaderboard: Vec<LeaderboardEntry>,
}

#[Object]
impl QueryRoot {
    async fn value(&self) -> &u64 {
        &self.value
    }

    async fn best(&self) -> &u64 {
        &self.best
    }

    async fn player_name(&self) -> &str {
        &self.player_name
    }

    async fn is_leaderboard_chain(&self) -> bool {
        self.is_leaderboard
    }

    async fn leaderboard(&self) -> &Vec<LeaderboardEntry> {
        &self.leaderboard
    }

    async fn my_rank(&self) -> Option<usize> {
        self.leaderboard
            .iter()
            .position(|entry| entry.player_name == self.player_name)
            .map(|pos| pos + 1)
    }
} 