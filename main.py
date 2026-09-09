# Remove duplicate numbers from list
# input  arr = [1, 2, 2, 3, 4, 4, 5]
# output = [1, 2, 3, 4, 5]

def remove_duplicates(arr):
    results = []

    for num in arr:
        already_exists= False
        for item in results:
            if item == num:
                already_exists = True
                break
        if not already_exists:
            results.append(num)

    return results

print(remove_duplicates([1, 2, 2, 3, 4, 4, 5]))