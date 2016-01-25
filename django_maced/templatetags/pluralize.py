from django import template

register = template.Library()


@register.filter(name='pluralize')
def pluralize(singular_version):
    if singular_version.endswith(("s", "x", "ch", "sh")):
        return singular_version + "es"
    elif singular_version.endswith("y"):
        if singular_version.endswith(("ay", "ey", "iy", "oy", "uy", "yy")):
            return singular_version + "s"
        else:
            return singular_version[:-1] + "ies"
    elif singular_version.endswith("f"):
        return singular_version[:-1] + "ves"
    elif singular_version.endswith("fe"):
        return singular_version[:-2] + "ves"
    else:
        return singular_version + "s"