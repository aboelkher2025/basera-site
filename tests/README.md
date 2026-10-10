# Tests

`panel-harness.html` runs the control panel on a mock backend with fixture data so every
view and every account type can be exercised without credentials. Serve the repository
root and open `/tests/panel-harness.html?role=super_admin` (roles: super_admin, admin,
trainer, client_admin, learner, partner). It is never deployed.
