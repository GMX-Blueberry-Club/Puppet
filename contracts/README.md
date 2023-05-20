# puppet-finance
A public draft for Puppet Finance

## Description

#### start point
- we have 1 position, for both puppets and trader
- say a trader have 2 puppets with 100$ in their deposit account each, role for both is 10%
- trader comes with 100$ collateral and opens 1000$ position (10x leverage) --> trader gets 100 shares
- puppets add 20$ collateral for 200$ position (same 10x leverage) --> each puppet gets 10 shares
 
#### scenarios:

*trader increases position size by 1000$:*
- trader's position is 100$/2000$ (20x leverage)
- puppet's position is 20$/400 (same 20x leverage)
- shares stay the same

*trader decreases position size by 500$:*
- trader's position is 100$/500$ (5x leverage)
- puppet's position is 20$/100$ (same 5x leverage)
- shares stay the same

*trader adds 100$ collateral to position:*
- trader's position is 200$/1000$ (5x leverage) - trader gets another 200 shares
- (here we want same leverage without adding collateral) puppet's position will be 20$/100$ (instead of the initial 20$/200$) (which gives us same 5x leverage) - shares untouched
- position leverage will now be still >5x (as puppet's position size didnt decrease), so we decrease position to the point where it 5x

*trader removes 50$ collateral from position:*
- trader's position is 50$/1000$ (20x leverage) - we burn 50 shares from trader, send 50$ collateral to trader
- puppet's position is 10$/200$ (20x leverage) - we burn 5 shares from each puppet, and send 5$ to each puppet


#### fees

- *margin fee:* (~.1% of position, requires added funds from user, taken on position increase/decrease) - (1) trader always pays for himself, (2) for puppets we withdraw more funds from their deposit account, liquidate their position if can't (decrease position by their pro-rata share and send their deposit account the collateral)
- *borrow fee:* (deducted from position's collateral) - this is accounted for out of the box with the shares mechanism + the fact that there's always symmetry between trader and puppets positions
