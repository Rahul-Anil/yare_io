my_player_id = "rahulanil101"


def find_base_info():
    for base in [base_zxq, base_a2c, base_p89, base_nua]:
        if base.control == my_player_id:
            my_base_list.push(base)
        elif base.control == "":
            neutral_base_list.push(base)
        else:
            enemy_base_list.push(base)
    return my_base_list, neutral_base_list, enemy_base_list

my_base_list, neutral_base_list, enemy_base_list = find_base_info()

print(f"my_base_list: {my_base_list}")
print(f"neutral_base_list: {neutral_base_list}")
print(f"enemy_base_list: {enemy_base_list}")

