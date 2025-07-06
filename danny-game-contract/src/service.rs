#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;
use async_graphql::{EmptySubscription, Object, Schema};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::WithServiceAbi,
    views::View, Service, ServiceRuntime,
};

use danny_game::{ApplicationParameters, LeaderboardEntry, Operation};
use self::state::DannyGameState;

pub struct DannyGameService {
    state: Arc<DannyGameState>,
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
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        Schema::build(
            QueryRoot {
                state: self.state.clone(),
                runtime: self.runtime.clone(),
            },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
            .finish()
            .execute(query)
            .await
    }
}

#[allow(dead_code)]
struct QueryRoot {
    state: Arc<DannyGameState>,
    runtime: Arc<ServiceRuntime<DannyGameService>>,
}

#[Object]
impl QueryRoot {
    async fn value(&self) -> u64 {
        *self.state.value.get()
    }

    async fn best(&self) -> u64 {
        *self.state.best.get()
    }

    async fn player_name(&self) -> String {
        self.state.player_name.get().clone()
    }

    async fn leaderboard(&self) -> Vec<LeaderboardEntry> {
        self.state.top_leaderboard.get().clone()
    }

    async fn is_leaderboard_chain(&self) -> bool {
        *self.state.is_leaderboard_chain.get()
    }

    async fn leaderboard_chain_id(&self) -> Option<String> {
        self.state.leaderboard_chain_id.get().map(|id| id.to_string())
    }

    async fn my_rank(&self) -> Option<u32> {
        let player_name = self.state.player_name.get().clone();
        let leaderboard = self.state.top_leaderboard.get().clone();

        leaderboard.iter().position(|entry| entry.player_name == player_name)
            .map(|pos| (pos + 1) as u32)
    }
}